const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

/**
 * Offload file parsing & MongoDB insertion to a background Worker Thread
 * @param {string} filePath - Path to uploaded spreadsheet / CSV
 * @param {string} mongoUri - MongoDB connection URI
 * @returns {Promise<Object>} Statistics on completion
 */
function processFileWithWorker(filePath, mongoUri) {
  return new Promise((resolve, reject) => {
    const workerPath = path.resolve(__dirname, '../workers/fileUploadWorker.js');
    logger.info(`Spawning Worker Thread for file: ${filePath}`);

    const worker = new Worker(workerPath, {
      workerData: {
        filePath,
        mongoUri: mongoUri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/policy_assessment_db'
      }
    });

    worker.on('message', (message) => {
      // Clean up uploaded temp file
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        logger.warn(`Failed to clean up uploaded file: ${err.message}`);
      }

      if (message.success) {
        logger.info(`Worker Thread completed successfully. Processed ${message.stats.processedRows} rows.`);
        resolve(message.stats);
      } else {
        logger.error(`Worker Thread encountered an error: ${message.error}`);
        reject(new Error(message.error));
      }
    });

    worker.on('error', (err) => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (_) {}
      logger.error(`Worker Thread crashed: ${err.message}`);
      reject(err);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (_) {}
        logger.warn(`Worker Thread stopped with exit code ${code}`);
      }
    });
  });
}

module.exports = { processFileWithWorker };
