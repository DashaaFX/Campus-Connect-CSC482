const Category = require('../models/Category');


// Get all categories with subcategories
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().lean();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// Create new category (admin only)
exports.createCategory = async (req, res) => {
  try {
    const { name, subcategories } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-');
   
    const category = new Category({
      name,
      slug,
      subcategories: subcategories.map(sub => ({
        ...sub,
        slug: sub.name.toLowerCase().replace(/\s+/g, '-')
      }))
    });
   
    await category.save();
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
