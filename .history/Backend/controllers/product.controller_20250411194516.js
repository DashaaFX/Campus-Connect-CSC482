import Product from '../models/product.model.js';
import asyncHandler from '../middleware/asyncHandler.js';

// @desc    Create a new product
// @route   POST /api/products
// @access  Private
/*export const createProduct = asyncHandler(async (req, res) => {
  const imagePaths = req.files?.map(file => file.path) || [];
  const product = await Product.create({
    ...req.body,
    images: imagePaths,
    seller: req.user._id // Assuming user is attached by auth middleware
  });

  res.status(201).json({
    success: true,
    data: product
  });
});
*/

export const createProduct = asyncHandler(async (req, res) => {
  const { title, description, price, category, subcategory, condition, stock } = req.body;
  
  // Validate required fields
  if (!title || !price || !category || !subcategory) {
    res.status(400);
    throw new Error('Please include all required fields');
  }

  const imagePaths = req.files?.map(file => file.path) || [];
  
  const product = await Product.create({
    title,
    description,
    price: parseFloat(price),
    category,
    subcategory,
    condition: condition || 'good',
    stock: parseInt(stock) || 1,
    images: imagePaths,
    seller: req.user._id
  });

  res.status(201).json({
    success: true,
    data: product
  });
});

// @desc    Get all products with filtering, sorting, and pagination
// @route   GET /api/products
// @access  Public
export const getProducts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Build query
  const queryObj = { ...req.query };
  const excludedFields = ['page', 'sort', 'limit', 'fields'];
  excludedFields.forEach(field => delete queryObj[field]);

  // Advanced filtering
  let queryStr = JSON.stringify(queryObj);
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, match => `$${match}`);
  
  let query = Product.find(JSON.parse(queryStr));

  // Sorting
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Field limiting
  if (req.query.fields) {
    const fields = req.query.fields.split(',').join(' ');
    query = query.select(fields);
  }

  // Execute query with pagination
  const products = await query.skip(skip).limit(limit);
  const total = await Product.countDocuments(JSON.parse(queryStr));

  res.status(200).json({
    success: true,
    count: products.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    data: products
  });
});

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('seller', 'name email');

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  res.status(200).json(product);
});

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private
export const updateProduct = asyncHandler(async (req, res) => {
  let product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // Check if user is the seller
  if (product.seller.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('User not authorized to update this product');
  }

  // Update the product
  product = await Product.findByIdAndUpdate(
    req.params.id,
    { ...req.body, updatedAt: Date.now() },
    { new: true, runValidators: true }
  );

  res.status(200).json(product);
});

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // Check if user is the seller
  if (product.seller.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('User not authorized to delete this product');
  }

  await product.deleteOne();

  res.status(200).json({ message: 'Product removed' });
});

// @desc    Update product stock
// @route   PATCH /api/products/:id/stock
// @access  Private
export const updateStock = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // Check if user is the seller
  if (product.seller.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('User not authorized to update this product');
  }

  // Validate new stock quantity
  if (product.stock + quantity < 0) {
    res.status(400);
    throw new Error('Invalid stock quantity');
  }

  product.stock += quantity;
  if (quantity < 0) {
    product.quantitySold += Math.abs(quantity);
  }

  await product.save();

  res.status(200).json(product);
});

// @desc    Search products
// @route   GET /api/products/search
// @access  Public
export const searchProducts = asyncHandler(async (req, res) => {
  const { q, category } = req.query;
  const query = {};

  // Add text search if query parameter exists
  if (q) {
    query.$text = { $search: q };
  }

  // Add category filter if category parameter exists
  if (category) {
    query.category = category;
  }

  const products = await Product.find(query)
    .sort({ score: { $meta: 'textScore' } })
    .limit(20);

  res.status(200).json({
    success: true,
    count: products.length,
    data: products
  });
});

// @desc    Get products by category
// @route   GET /api/products/category/:category
// @access  Public
export const getProductsByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;
  const { subcategory } = req.query;
  const query = { category };

  if (subcategory) {
    query.subcategory = subcategory;
  }

  const products = await Product.find(query).sort('-createdAt');

  res.status(200).json({
    success: true,
    count: products.length,
    data: products
  });
});

// @desc    Get seller's products
// @route   GET /api/products/seller/:sellerId
// @access  Public
export const getSellerProducts = asyncHandler(async (req, res) => {
  const { sellerId } = req.params;
  const products = await Product.find({ seller: sellerId }).sort('-createdAt');

  res.status(200).json({
    success: true,
    count: products.length,
    data: products
  });
});