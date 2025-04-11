import mongoose from "mongoose";
const productSchema = new mongoose.Schema({
  // Common fields for all products
  title: { 
    type: String, 
    required: [true, 'Product title is required'],
    trim: true,
    maxlength: [100, 'Product title cannot exceed 100 characters'],
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  price: { 
    type: Number, 
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    set: v => Math.round(v * 100) / 100 // Ensure 2 decimal places
  },
  seller: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'Seller ID is required'],
    index: true
  },
  category: { 
    type: String, 
    required: [true, 'Category is required'], 
    enum: {
      values: [
        'academic', 
        'electronics', 
        'dorm', 
        'clothing', 
        'supplies', 
        'sports', 
        'miscellaneous'
      ],
      message: 'Invalid product category'
    },
    index: true
  },
  subcategory: { 
    type: String, 
    required: [true, 'Subcategory is required'],
    index: true
  },
  images: {
    type: [String],
    validate: {
      validator: function(v) {
        return v.length <= 10; // Maximum 10 images
      },
      message: 'Cannot have more than 10 product images'
    }
  },
  condition: { 
    type: String, 
    enum: {
      values: ['new', 'like new', 'good', 'fair', 'poor'],
      message: 'Invalid product condition'
    },
    default: 'good'
  },
  stock: {
    type: Number,
    min: [0, 'Stock cannot be negative'],
    default: 1
  },
  quantitySold: {
    type: Number,
    min: 0,
    default: 0
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    immutable: true
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  
  // Category-specific attributes
  attributes: { 
    type: mongoose.Schema.Types.Mixed,
    validate: {
      validator: function(v) {
        // Add any category-specific attribute validation here
        return true;
      },
      message: 'Invalid product attributes'
    }
  }
}, {
  // Enable automatic updatedAt tracking
  timestamps: { createdAt: true, updatedAt: true },
  // Enable virtuals to be included in toJSON/toObject
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for subcategory validation
productSchema.path('subcategory').validate(function(value) {
  const categoryMap = {
    academic: ['textbooks', 'lab_manuals', 'solution_guides', 'lecture_notes', 'exam_papers', 'study_guides', 'research_papers'],
    electronics: ['laptops', 'calculators', 'tablets', 'headphones', 'chargers'],
    dorm: ['minifridges', 'bedding', 'storage', 'lighting'],
    clothing: ['formal_wear', 'winter_gear', 'university_merch', 'bags', 'footwear'],
    supplies: ['notebooks', 'pens', 'stationery', 'printer_supplies'],
    sports: ['yoga_mats', 'bikes', 'sports_gear'],
    miscellaneous: ['appliances', 'games', 'suitcases', 'art_supplies']
  };
  
  if (!this.category) return true; // Skip if category not set yet
  const validSubcategories = categoryMap[this.category];
  
  if (!validSubcategories) {
    throw new Error(`No subcategories defined for category: ${this.category}`);
  }
  
  return validSubcategories.includes(value);
}, 'Invalid subcategory for this category');

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