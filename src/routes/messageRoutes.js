const express = require('express');
const {
  scheduleMessage,
  getScheduledMessages,
  getInsertedMessages
} = require('../controllers/messageController');

const router = express.Router();

// Task 2.2: Post-service that takes message, day, and time in body parameters
router.post('/schedule', scheduleMessage);

// Helper: list scheduled messages
router.get('/scheduled', getScheduledMessages);

// Helper: list messages inserted into DB
router.get('/', getInsertedMessages);

module.exports = router;
