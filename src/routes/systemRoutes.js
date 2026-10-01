const express = require('express');
const { getCpuStatus, simulateHighCpu } = require('../controllers/systemController');

const router = express.Router();

// Task 2.1: Real-time CPU status
router.get('/cpu-status', getCpuStatus);

// Task 2.1: Simulation / testing endpoint for 70% CPU auto-restart
router.post('/simulate-high-cpu', simulateHighCpu);

module.exports = router;
