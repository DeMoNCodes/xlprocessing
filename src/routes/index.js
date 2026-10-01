const express = require('express');
const uploadRoutes = require('./uploadRoutes');
const policyRoutes = require('./policyRoutes');
const messageRoutes = require('./messageRoutes');
const systemRoutes = require('./systemRoutes');

const router = express.Router();

router.use('/upload', uploadRoutes);
router.use('/policies', policyRoutes);
router.use('/messages', messageRoutes);
router.use('/system', systemRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
