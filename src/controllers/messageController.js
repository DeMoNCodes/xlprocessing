const schedulerService = require('../services/schedulerService');
const ScheduledMessage = require('../models/ScheduledMessage');
const Message = require('../models/Message');
const logger = require('../utils/logger');

/**
 * Task 2.2: Post-service that takes message, day, and time in body parameters
 * and inserts that message into DB at that particular day and time.
 */
const scheduleMessage = async (req, res) => {
  try {
    const { message, day, time } = req.body;

    if (!message || !day || !time) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters. "message", "day", and "time" are all required in request body.',
        example: {
          message: 'Policy renewal reminder for John',
          day: '2026-10-02',
          time: '14:30'
        }
      });
    }

    const scheduledDoc = await schedulerService.scheduleMessage(message, day, time);

    return res.status(201).json({
      success: true,
      message: 'Message successfully scheduled for insertion at specified day and time.',
      data: {
        id: scheduledDoc._id,
        message: scheduledDoc.message,
        day: scheduledDoc.day,
        time: scheduledDoc.time,
        targetExecutionTime: scheduledDoc.targetExecutionTime,
        status: scheduledDoc.status
      }
    });
  } catch (error) {
    logger.error(`Schedule message error: ${error.message}`);
    return res.status(400).json({
      success: false,
      message: 'Failed to schedule message.',
      error: error.message
    });
  }
};

/**
 * List all scheduled messages
 */
const getScheduledMessages = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const messages = await ScheduledMessage.find(filter).sort({ targetExecutionTime: 1 }).limit(100);

    return res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * List all messages inserted into DB
 */
const getInsertedMessages = async (req, res) => {
  try {
    const messages = await Message.find()
      .populate('scheduledMessageId')
      .sort({ insertedAt: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  scheduleMessage,
  getScheduledMessages,
  getInsertedMessages
};
