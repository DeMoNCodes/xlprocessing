const mongoose = require('mongoose');

const userAccountSchema = new mongoose.Schema(
  {
    accountName: {
      type: String,
      required: [true, 'Account name is required'],
      trim: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'user_accounts'
  }
);

module.exports = mongoose.model('UserAccount', userAccountSchema);
