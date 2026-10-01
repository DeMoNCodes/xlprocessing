const mongoose = require('mongoose');

const policySchema = new mongoose.Schema(
  {
    policy_number: {
      type: String,
      required: [true, 'Policy number is required'],
      trim: true,
      index: true
    },
    policy_start_date: {
      type: Date
    },
    policy_end_date: {
      type: Date
    },
    policy_category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PolicyCategory',
      required: [true, 'Policy category ID is required'],
      index: true
    },
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PolicyCarrier',
      required: [true, 'Company / Carrier ID is required'],
      index: true
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    agent_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      index: true
    },
    account_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserAccount',
      index: true
    },
    premium_amount: {
      type: Number,
      default: 0
    },
    policy_type: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
    collection: 'policies'
  }
);

policySchema.index({ user_id: 1, policy_number: 1 });

module.exports = mongoose.model('Policy', policySchema);
