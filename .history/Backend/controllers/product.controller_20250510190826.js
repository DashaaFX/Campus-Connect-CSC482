import Product from '../models/product.model.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { Category } from '../models/category.model.js';
import { Subcategory } from '../models/subcategory.model.js';

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

// Create product
export const createProduct = asyncHandler(async (req, res) => {
  const { title, price, category, subcategory, condition, stock, description } = req.body;

  if (!title || !price || !category || !subcategory) {
    res.status(400);
    throw new Error('Please include all required fields');
  }

  const validCategory = await Category.findById(category);
  if (!validCategory) {
    res.status(400);
    throw new Error('Invalid category ID');
  }

  const validSubcategory = await Subcategory.findOne({ _id: subcategory, category });
  if (!validSubcategory) {
    res.status(400);
    throw new Error('Invalid subcategory for the selected category');
  }

  const imagePaths = req.files?.map(file => `/uploads/${file.filename}`) || [];

  const product = await Product.create({
    title,
    description,
    price: parseFloat(price),
    category,
    subcategory,
    condition: condition || 'good',
    stock: parseInt(stock) || 1,
    images: imagePaths,
    seller: req.user._id,
    attributes: req.body.attributes || {}
  });

  const populatedProduct = await Product.findById(product._id)
    .populate('category', 'name')
    .populate('subcategory', 'name');

  res.status(201).json({ success: true, data: populatedProduct });
});

// @desc    Get all products with filtering, sorting, and pagination
// @route   GET /api/products
// @access  Public
// Get all products
// @desc    Get all products with filtering, partial search, sorting, and pagination
// @route   GET /api/products
// @access  Public
export const getProducts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const { q, category, subcategory, sort, fields } = req.query;
  
  const query = {};

  // Search with partial typing using REGEX
  if (q) {
    const searchRegex = new RegExp(q, 'i'); // case-insensitive partial match
    query.$or = [
      { title: { $regex: searchRegex } },
      { description: { $regex: searchRegex } },
    ];
  }

  // Category filter
  if (category) {
    query.category = category;
  }

  // Subcategory filter
  if (subcategory) {
    query.subcategory = subcategory;
  }

  let dbQuery = Product.find(query)
    .populate('category', 'name')
    .populate('subcategory', 'name')
    .populate('seller', 'fullname email');

  // Sorting
  if (sort) {
    const sortBy = sort.split(',').join(' ');
    dbQuery = dbQuery.sort(sortBy);
  } else {
    dbQuery = dbQuery.sort('-createdAt'); // Newest first
  }

  // Field selection (only if not text search)
  if (fields) {
    const selectedFields = fields.split(',').join(' ');
    dbQuery = dbQuery.select(selectedFields);
  }

  dbQuery = dbQuery.skip(skip).limit(limit);

  const [products, total] = await Promise.all([
    dbQuery,
    Product.countDocuments(query)
  ]);

  res.status(200).json({
    success: true,
    count: products.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    data: products,
  });
});



// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('category', 'name')
    .populate('subcategory', 'name')
    .populate('seller', 'name email');

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