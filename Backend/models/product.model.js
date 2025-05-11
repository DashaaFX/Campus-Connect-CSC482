// Updated product.model.js to use ObjectId refs for category and subcategory
import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 100, index: true },
  description: { type: String, trim: true, maxlength: 2000 },
  price: { type: Number, required: true, min: 0, set: v => Math.round(v * 100) / 100 },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  subcategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Subcategory', required: true, index: true },
  images: {
    type: [String],
    validate: {
      validator: v => v.length <= 10,
      message: 'Cannot have more than 10 product images'
    }
  },
  pdf: {
    type: [String],
    validate: {
      validator: v=> v.length<=5,
      message: 'Cannot have more than 5 pdfs'
    },
    default: []
  },
  condition: {
    type: String,
    enum: ['new', 'like new', 'good', 'fair', 'poor'],
    default: 'good'
  },
  stock: { type: Number, min: 0, default: 1 },
  quantitySold: { type: Number, min: 0, default: 0 },
  attributes: { type: mongoose.Schema.Types.Mixed },
  
  createdAt: { 
    type: Date, 
    default: Date.now,
    immutable: true
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
}, {
  timestamps: { createdAt: true, updatedAt: true },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
productSchema.index({
  title: 'text',
  description: 'text'
}, {
  weights: {
    title: 3, // Give title more weight in text searches
    description: 1
  },
  name: 'product_text_search_index'
});

// Middleware to handle errors and update timestamps
productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method for better error handling
productSchema.statics.findOrFail = async function(id) {
  const product = await this.findById(id);
  if (!product) {
    throw new Error('Product not found');
  }
  return product;
};

// Virtual for availability status
productSchema.virtual('isAvailable').get(function() {
  return this.stock > 0;
});

const Product = mongoose.model('Product', productSchema);
export default Product;


