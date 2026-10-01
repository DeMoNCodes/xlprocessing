const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const apiRoutes = require('./routes');
const logger = require('./utils/logger');

const app = express();

// Standard middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

const path = require('path');

// Serve static frontend dashboard
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api', apiRoutes);

// Root / API documentation endpoint
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Insurance Policy Management API',
    version: '1.0.0',
    documentation: {
      dashboardUI: 'GET / (Interactive Dashboard)',
      uploadData: 'POST /api/upload (multipart/form-data with "file")',
      searchPoliciesByUsername: 'GET /api/policies/search?username=John',
      aggregatePoliciesByUser: 'GET /api/policies/aggregate-by-user',
      realTimeCpuStatus: 'GET /api/system/cpu-status',
      simulateHighCpu: 'POST /api/system/simulate-high-cpu',
      scheduleMessage: 'POST /api/messages/schedule',
      getScheduledMessages: 'GET /api/messages/scheduled',
      getInsertedMessages: 'GET /api/messages'
    }
  });
});

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error(`Unhandled Error: ${err.message}`);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

module.exports = app;
