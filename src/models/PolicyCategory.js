const mongoose = require('mongoose');

const policyCategorySchema = new mongoose.Schema(
  {
    category_name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      unique: true,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'policy_categories'
  }
);

module.exports = mongoose.model('PolicyCategory', policyCategorySchema);
