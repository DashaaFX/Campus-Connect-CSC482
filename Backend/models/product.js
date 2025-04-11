
// models/Product.js
const mongoose = require('mongoose');


const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  subcategory:{
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    validate: {
      validator: async function(value) {
        const category = await mongoose.model('Category').findOne({
          _id: this.category,
          'subcategories._id': value
        });
        return !!category;
      },
      message: 'Invalid subcategory for this category'
    }
  },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  images: [{ type: String }],
  condition: { type: String, enum: ['new', 'used', 'refurbished'], required: true },
  attributes: { type: mongoose.Schema.Types.Mixed }, // Dynamic attributes
  status: { type: String, enum: ['active', 'sold', 'pending'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});


// Indexes for faster queries
productSchema.index({ category: 1, subcategory: 1 });
productSchema.index({ title: 'text', description: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });


module.exports = mongoose.model('Product', productSchema);


