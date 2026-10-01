require('dotenv').config();
const cluster = require('cluster');
const logger = require('./utils/logger');
const { startServer } = require('./server');

// If running in test or explicitly requested single-process
if (process.env.NO_CLUSTER === 'true' || process.env.NODE_ENV === 'test') {
  startServer();
} else if (cluster.isPrimary || cluster.isMaster) {
  logger.info(`[Primary Supervisor] Process PID: ${process.pid} is running.`);
  logger.info(`[Primary Supervisor] Spawning server worker...`);

  const forkWorker = () => {
    const worker = cluster.fork();
    logger.info(`[Primary Supervisor] Worker process ${worker.process.pid} spawned.`);
    return worker;
  };

  forkWorker();

  cluster.on('exit', (worker, code, signal) => {
    logger.warn(
      `[Primary Supervisor] Worker ${worker.process.pid} exited with code: ${code}, signal: ${signal}.`
    );

    // Code 100 indicates restart requested by CPU monitor or intentional restart
    if (code === 100) {
      logger.info(`[Primary Supervisor] Auto-restart triggered due to CPU utilization threshold. Spawning fresh worker...`);
    } else {
      logger.info(`[Primary Supervisor] Worker terminated. Respawning replacement worker...`);
    }

    // Small backoff before respawning
    setTimeout(() => {
      forkWorker();
    }, 500);
  });
} else {
  // Worker process runs the Express server
  startServer();
}
