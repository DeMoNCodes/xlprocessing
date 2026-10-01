const ScheduledMessage = require('../models/ScheduledMessage');
const Message = require('../models/Message');
const { parseScheduledDateTime } = require('../utils/dateHelper');
const logger = require('../utils/logger');

class SchedulerService {
  constructor() {
    this.activeTimeouts = new Map(); // id -> setTimeout handle
    this.recoveryInterval = null;
  }

  /**
   * Initialize scheduler: restore pending scheduled jobs from MongoDB
   */
  async init() {
    try {
      logger.info('[Scheduler] Initializing scheduled messages service...');
      await this.restorePendingJobs();

      // Periodic check every 30 seconds to catch any missed jobs due to clock shifts or restarts
      this.recoveryInterval = setInterval(() => {
        this.processDueJobs();
      }, 30000);

      if (this.recoveryInterval.unref) {
        this.recoveryInterval.unref();
      }
    } catch (err) {
      logger.error(`[Scheduler] Failed to initialize scheduler: ${err.message}`);
    }
  }

  /**
   * Schedule a new message to be inserted at given day and time
   * @param {string} message - Message text
   * @param {string} day - Day parameter
   * @param {string} time - Time parameter
   */
  async scheduleMessage(message, day, time) {
    if (!message || typeof message !== 'string' || message.trim() === '') {
      throw new Error('Valid message text is required');
    }

    const targetDate = parseScheduledDateTime(day, time);
    const now = new Date();

    // Create the scheduled message in DB
    const scheduledDoc = await ScheduledMessage.create({
      message: message.trim(),
      day,
      time,
      targetExecutionTime: targetDate,
      status: 'pending'
    });

    logger.info(
      `[Scheduler] Message scheduled (ID: ${scheduledDoc._id}) for target execution at: ${targetDate.toISOString()}`
    );

    const delayMs = targetDate.getTime() - now.getTime();

    if (delayMs <= 0) {
      // Due immediately
      setImmediate(() => this.executeJob(scheduledDoc._id));
    } else if (delayMs < 2147483647) {
      // Set accurate timer
      const timer = setTimeout(() => {
        this.executeJob(scheduledDoc._id);
      }, delayMs);

      this.activeTimeouts.set(scheduledDoc._id.toString(), timer);
    }

    return scheduledDoc;
  }

  /**
   * Execute inserting message into DB and marking scheduled record as completed
   */
  async executeJob(scheduledId) {
    try {
      // Clean up timer handle
      this.activeTimeouts.delete(scheduledId.toString());

      const scheduledDoc = await ScheduledMessage.findById(scheduledId);
      if (!scheduledDoc || scheduledDoc.status !== 'pending') {
        return;
      }

      // 1. Insert into messages collection
      const insertedMessage = await Message.create({
        message: scheduledDoc.message,
        scheduledMessageId: scheduledDoc._id,
        insertedAt: new Date(),
        metadata: {
          scheduledFor: scheduledDoc.targetExecutionTime,
          day: scheduledDoc.day,
          time: scheduledDoc.time
        }
      });

      // 2. Update status of ScheduledMessage
      scheduledDoc.status = 'completed';
      scheduledDoc.processedAt = new Date();
      await scheduledDoc.save();

      logger.info(
        `[Scheduler] SUCCESS: Scheduled message ${scheduledDoc._id} inserted into 'messages' collection with ID ${insertedMessage._id} at ${new Date().toISOString()}`
      );

      return insertedMessage;
    } catch (err) {
      logger.error(`[Scheduler] ERROR executing scheduled message ${scheduledId}: ${err.message}`);
      await ScheduledMessage.findByIdAndUpdate(scheduledId, {
        status: 'failed',
        error: err.message
      });
    }
  }

  /**
   * Restore all pending jobs on server startup
   */
  async restorePendingJobs() {
    const pendingJobs = await ScheduledMessage.find({ status: 'pending' });
    const now = new Date();
    let rearmed = 0;
    let immediate = 0;

    for (const job of pendingJobs) {
      const delayMs = job.targetExecutionTime.getTime() - now.getTime();
      if (delayMs <= 0) {
        // Overdue during downtime - execute now
        immediate++;
        await this.executeJob(job._id);
      } else if (delayMs < 2147483647) {
        rearmed++;
        const timer = setTimeout(() => {
          this.executeJob(job._id);
        }, delayMs);
        this.activeTimeouts.set(job._id.toString(), timer);
      }
    }

    logger.info(
      `[Scheduler] Restored pending jobs: ${rearmed} re-armed, ${immediate} executed immediately.`
    );
  }

  /**
   * Background poller to process any pending due jobs
   */
  async processDueJobs() {
    try {
      const dueJobs = await ScheduledMessage.find({
        status: 'pending',
        targetExecutionTime: { $lte: new Date() }
      }).limit(50);

      for (const job of dueJobs) {
        await this.executeJob(job._id);
      }
    } catch (err) {
      logger.error(`[Scheduler] Polling check failed: ${err.message}`);
    }
  }

  stop() {
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
    }
    for (const timer of this.activeTimeouts.values()) {
      clearTimeout(timer);
    }
    this.activeTimeouts.clear();
  }
}

module.exports = new SchedulerService();
