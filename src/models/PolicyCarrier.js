const mongoose = require('mongoose');

const policyCarrierSchema = new mongoose.Schema(
  {
    company_name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      unique: true,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'policy_carriers'
  }
);

module.exports = mongoose.model('PolicyCarrier', policyCarrierSchema);
