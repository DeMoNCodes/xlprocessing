const cpuMonitorService = require('../src/services/cpuMonitorService');
const logger = require('../src/utils/logger');

async function testCpuMonitor() {
  logger.info('Starting CPU Monitor Auto-Restart Unit Test...');

  let restartTriggered = false;
  let detectedUsage = 0;

  cpuMonitorService.setRestartHandler((usage) => {
    restartTriggered = true;
    detectedUsage = usage;
    logger.info(`[Test Callback] Restart callback invoked with usage: ${usage}%!`);
  });

  cpuMonitorService.start();

  // 1. Check current metrics
  const initialMetrics = cpuMonitorService.getCurrentUsage();
  logger.info('Initial CPU Metrics:', initialMetrics);

  if (initialMetrics.threshold !== 70) {
    throw new Error(`Expected threshold 70%, but got ${initialMetrics.threshold}%`);
  }

  // 2. Trigger high CPU event
  logger.info('Simulating CPU usage spike above 70% (target 78%)...');
  cpuMonitorService.triggerRestart(78);

  // 3. Verify restart callback was triggered
  if (!restartTriggered || detectedUsage !== 78) {
    throw new Error('CPU Monitor failed to invoke restart callback when exceeding 70% threshold!');
  }

  cpuMonitorService.stop();
  logger.info('>>> CPU Monitor Auto-Restart Test PASSED successfully! <<<');
}

testCpuMonitor().catch((err) => {
  logger.error('CPU test failed:', err);
  process.exit(1);
});
