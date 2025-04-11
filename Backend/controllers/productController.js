const Product = require('../models/product');
const Category = require('../models/category');


// Create new product
exports.createProduct = async (req, res) => {
  try {
    const { category, subcategory, attributes } = req.body;


    // 1. Validate category/subcategory relationship
    const categoryDoc = await Category.findOne({
      _id: category,
      'subcategories._id': subcategory
    }).lean();


    if (!categoryDoc) {
      return res.status(400).json({
        message: 'Invalid category/subcategory combination'
      });
    }


    // 2. Validate required attributes
    const subcategoryDoc = categoryDoc.subcategories.find(
      sub => sub._id.toString() === subcategory
    );


    const missingAttributes = subcategoryDoc.attributes
      .filter(attr => attr.required)
      .filter(attr => !attributes || !attributes[attr.name]);


    if (missingAttributes.length > 0) {
      return res.status(400).json({
        message: 'Missing required attributes',
        missing: missingAttributes.map(attr => attr.name)
      });
    }


    // 3. Sanitize attributes
    const sanitizedAttributes = {};
    if (attributes) {
      for (const [key, value] of Object.entries(attributes)) {
        if (value !== undefined && value !== null && value !== '') {
          sanitizedAttributes[key] = value;
        }
      }
    }


    // 4. Create product
    const product = new Product({
      ...req.body,
      attributes: sanitizedAttributes,
      seller: req.user._id
    });


    await product.save();
    res.status(201).json(product);


  } catch (err) {
    console.error('Product creation error:', err);
    res.status(400).json({
      message: err.message.includes('validation')
        ? 'Invalid product data'
        : 'Failed to create product'
    });
  }
};


// Get products with filtering
exports.getProducts = async (req, res) => {
  try {
    const {
      category,
      subcategory,
      q,
      minPrice,
      maxPrice,
      page = 1,
      limit = 20,
      sort = '-createdAt'
    } = req.query;


    const filter = {};
   
    // Category filtering
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
   
    // Price range
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
   
    // Text search
    let searchOptions = {};
    if (q) {
      filter.$text = { $search: q };
      searchOptions.score = { score: { $meta: 'textScore' } };
    }


    const products = await Product.find(filter, null, {
      ...searchOptions,
      skip: (page - 1) * limit,
      limit: Number(limit),
      sort
    })
    .populate('seller', 'username rating')
    .populate('category', 'name slug')
    .populate('subcategory', 'name slug');


    const count = await Product.countDocuments(filter);


    res.json({
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });


  } catch (err) {
    console.error('Product fetch error:', err);
   
    // Handle text search error gracefully
    if (err.message.includes('text index required')) {
      return res.status(400).json({
        message: 'Full-text search not available',
        suggestion: 'Try a different search method'
      });
    }


    res.status(500).json({
      message: 'Failed to fetch products',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};


// Get all products with category data
exports.getProductsCategory = async (req, res) => {
  try {
    const products = await Product.find()
      .populate({
        path: 'category',
        select: 'name slug'
      })
      .populate({
        path: 'subcategory',
        select: 'name slug'
      });


    res.json(products);
  } catch (err) {
    console.error('Products with category fetch error:', err);
    res.status(500).json({
      message: 'Failed to fetch products',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};
