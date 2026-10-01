const os = require('os');
const logger = require('../utils/logger');

class CpuMonitorService {
  constructor() {
    this.threshold = parseFloat(process.env.CPU_RESTART_THRESHOLD) || 70; // 70%
    this.intervalMs = parseInt(process.env.CPU_CHECK_INTERVAL_MS, 10) || 2000;
    this.intervalHandle = null;
    this.lastCpus = null;
    this.currentCpuUsage = 0;
    this.isRestarting = false;
    this.restartCallback = null;
  }

  // Calculate CPU usage percentage based on os.cpus() deltas
  getCpuAverage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (let i = 0; i < cpus.length; i++) {
      const cpu = cpus[i];
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }

    return {
      idle: totalIdle / cpus.length,
      total: totalTick / cpus.length
    };
  }

  calculateCpuUsage(firstSample, secondSample) {
    const idleDelta = secondSample.idle - firstSample.idle;
    const totalDelta = secondSample.total - firstSample.total;

    if (totalDelta <= 0) return 0;
    const usage = 100 - Math.round((100 * idleDelta) / totalDelta);
    return Math.max(0, Math.min(100, usage));
  }

  getCurrentUsage() {
    return {
      cpuPercentage: this.currentCpuUsage,
      threshold: this.threshold,
      cores: os.cpus().length,
      freeMemoryMB: Math.round(os.freemem() / (1024 * 1024)),
      totalMemoryMB: Math.round(os.totalmem() / (1024 * 1024)),
      processUptimeSeconds: Math.round(process.uptime()),
      systemUptimeSeconds: Math.round(os.uptime())
    };
  }

  setRestartHandler(callback) {
    this.restartCallback = callback;
  }

  start() {
    if (this.intervalHandle) return;

    this.lastCpus = this.getCpuAverage();

    logger.info(
      `[CPU Monitor] Started tracking CPU utilization (Threshold: ${this.threshold}%, Interval: ${this.intervalMs}ms)`
    );

    this.intervalHandle = setInterval(() => {
      const currentSample = this.getCpuAverage();
      const usage = this.calculateCpuUsage(this.lastCpus, currentSample);
      this.currentCpuUsage = usage;
      this.lastCpus = currentSample;

      logger.debug(`[CPU Monitor] Real-time CPU usage: ${usage}% (Threshold: ${this.threshold}%)`);

      if (usage >= this.threshold && !this.isRestarting) {
        this.triggerRestart(usage);
      }
    }, this.intervalMs);

    // Unref so this timer doesn't prevent Node process from closing naturally if needed
    if (this.intervalHandle.unref) {
      this.intervalHandle.unref();
    }
  }

  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      logger.info('[CPU Monitor] Stopped CPU tracking');
    }
  }

  triggerRestart(usage) {
    this.isRestarting = true;
    logger.warn(
      `[CPU Monitor] ALERT: Real-time CPU usage reached ${usage}%, exceeding ${this.threshold}% threshold! Triggering server restart...`
    );

    if (this.restartCallback) {
      this.restartCallback(usage);
    } else {
      // Default fallback: exit with status code 100 (restart signal to supervisor)
      setTimeout(() => {
        logger.warn('[CPU Monitor] Process exiting for supervisor restart...');
        process.exit(100);
      }, 500);
    }
  }
}

// Export singleton instance
module.exports = new CpuMonitorService();
