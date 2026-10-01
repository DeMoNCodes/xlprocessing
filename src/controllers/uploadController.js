const path = require('path');
const { processFileWithWorker } = require('../services/fileUploadService');
const logger = require('../utils/logger');

/**
 * Handle XLSX/CSV upload and dispatch to worker thread
 */
const uploadDataFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please upload a .xlsx, .xls, or .csv file with field "file".'
      });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const fileExt = path.extname(originalName).toLowerCase();

    if (!['.xlsx', '.xls', '.csv'].includes(fileExt)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported file type: ${fileExt}. Only .xlsx, .xls, and .csv are supported.`
      });
    }

    logger.info(`Received file upload: ${originalName} (${req.file.size} bytes). Offloading to worker thread...`);

    // Process file in isolated Worker Thread
    const stats = await processFileWithWorker(filePath, process.env.MONGODB_URI);

    return res.status(200).json({
      success: true,
      message: 'File successfully processed and ingested into MongoDB via Worker Thread.',
      file: originalName,
      stats
    });
  } catch (error) {
    logger.error(`File upload processing failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to process and ingest data file.',
      error: error.message
    });
  }
};

module.exports = { uploadDataFile };
