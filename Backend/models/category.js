const Mongoose = require('mongoose');
// models/Category.js
const mongoose = require('mongoose');


const subcategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  attributes: [{
    name: { type: String, required: true },
    type: { type: String, enum: ['text', 'number', 'select'], required: true },
    options: [{ type: String }], // For select fields
    required: { type: Boolean, default: false }
  }]
}, { _id: true });  // Using _id: true to create a unique identifier for each subcategory


const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  subcategories: [subcategorySchema],
  createdAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model('Category', categorySchema);
