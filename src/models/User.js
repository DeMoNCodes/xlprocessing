const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      index: true
    },
    dob: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    phoneNumber: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    zipCode: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      index: true
    },
    gender: {
      type: String,
      trim: true
    },
    userType: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
    collection: 'users'
  }
);

// Compound index for efficient user queries
userSchema.index({ firstName: 1, email: 1 });

module.exports = mongoose.model('User', userSchema);
