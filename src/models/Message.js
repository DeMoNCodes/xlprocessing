const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: [true, 'Message text is required'],
      trim: true
    },
    scheduledMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ScheduledMessage',
      index: true
    },
    insertedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    metadata: {
      type: Object,
      default: {}
    }
  },
  {
    timestamps: true,
    collection: 'messages'
  }
);

module.exports = mongoose.model('Message', messageSchema);
