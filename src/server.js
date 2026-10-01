require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');
const cpuMonitorService = require('./services/cpuMonitorService');
const schedulerService = require('./services/schedulerService');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;
let server;

async function startServer() {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Initialize Scheduler Service (restores pending jobs)
    await schedulerService.init();

    // 3. Create HTTP Server
    server = http.createServer(app);

    // 4. Configure CPU Monitor with Restart Action
    cpuMonitorService.setRestartHandler(async (currentUsage) => {
      logger.warn(`[Server] Restart triggered due to high CPU load: ${currentUsage}%`);
      await gracefulRestart();
    });
    cpuMonitorService.start();

    // 5. Start Listening
    server.listen(PORT, () => {
      logger.info(`=================================================`);
      logger.info(`  Server running on http://localhost:${PORT}`);
      logger.info(`  Process ID (PID): ${process.pid}`);
      logger.info(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`  CPU Auto-Restart Threshold: ${process.env.CPU_RESTART_THRESHOLD || 70}%`);
      logger.info(`=================================================`);
    });

    return server;
  } catch (err) {
    logger.error(`Fatal error starting server: ${err.message}`);
    process.exit(1);
  }
}

async function gracefulRestart() {
  logger.info('[Server] Performing graceful restart...');
  cpuMonitorService.stop();
  schedulerService.stop();

  if (server) {
    server.close(async () => {
      logger.info('[Server] HTTP connections closed.');
      await disconnectDB();
      // Exit with 100: signals the cluster/supervisor in index.js to respawn worker
      process.exit(100);
    });

    // Force exit if connections don't close within 3 seconds
    setTimeout(() => {
      logger.warn('[Server] Forcing process exit after timeout.');
      process.exit(100);
    }, 3000);
  } else {
    process.exit(100);
  }
}

// Graceful shutdown signals (SIGINT, SIGTERM)
process.on('SIGINT', async () => {
  logger.info('[Server] Received SIGINT. Shutting down gracefully...');
  cpuMonitorService.stop();
  schedulerService.stop();
  if (server) {
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGTERM', async () => {
  logger.info('[Server] Received SIGTERM. Shutting down gracefully...');
  cpuMonitorService.stop();
  schedulerService.stop();
  if (server) {
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

// Run directly if called as main
if (require.main === module) {
  startServer();
}

module.exports = { startServer, gracefulRestart };
