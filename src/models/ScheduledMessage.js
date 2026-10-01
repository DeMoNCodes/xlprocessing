const mongoose = require('mongoose');

const scheduledMessageSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: [true, 'Message text is required'],
      trim: true
    },
    day: {
      type: String,
      required: [true, 'Day parameter is required (e.g. YYYY-MM-DD or Day name)'],
      trim: true
    },
    time: {
      type: String,
      required: [true, 'Time parameter is required (e.g. HH:mm or HH:mm:ss)'],
      trim: true
    },
    targetExecutionTime: {
      type: Date,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true
    },
    error: {
      type: String
    }
  },
  {
    timestamps: true,
    collection: 'scheduled_messages'
  }
);

module.exports = mongoose.model('ScheduledMessage', scheduledMessageSchema);
