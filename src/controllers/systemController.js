const cpuMonitorService = require('../services/cpuMonitorService');
const logger = require('../utils/logger');

/**
 * Task 2.1: Get real-time CPU utilization and system metrics
 */
const getCpuStatus = (req, res) => {
  const metrics = cpuMonitorService.getCurrentUsage();
  return res.status(200).json({
    success: true,
    data: metrics
  });
};

/**
 * Simulation helper: Burn CPU cycles to verify real-time 70% threshold and restart
 */
const simulateHighCpu = (req, res) => {
  const durationMs = parseInt(req.body.durationMs || req.query.durationMs, 10) || 3500;
  const targetUsage = parseInt(req.body.targetUsage || req.query.targetUsage, 10) || 85;

  logger.warn(
    `[CPU Test] Simulating high CPU load (${targetUsage}%) for ${durationMs}ms to test auto-restart...`
  );

  // Send response before burning CPU so client gets confirmation
  res.status(200).json({
    success: true,
    message: `CPU load simulation started. Server should detect usage >= 70% and trigger a restart shortly.`,
    simulatedUsage: `${targetUsage}%`,
    durationMs
  });

  // Execute CPU burn in next tick
  setImmediate(() => {
    // If explicit target usage given and higher than 70%, trigger monitor check
    const startTime = Date.now();
    // Busy loop to spike CPU utilization
    while (Date.now() - startTime < durationMs) {
      Math.sqrt(Math.random() * 1000000);
    }

    // Force an immediate threshold check / restart trigger
    cpuMonitorService.triggerRestart(targetUsage);
  });
};

module.exports = {
  getCpuStatus,
  simulateHighCpu
};
