// routes/category.route.js
import express from 'express';
import { Category } from '../models/category.model.js';
import { Subcategory } from '../models/subcategory.model.js';

const router = express.Router();

// GET /api/categories - all categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

// GET /api/categories/:categoryId/subcategories - subcategories for a category
router.get('/:categoryId/subcategories', async (req, res) => {
  try {
    const subcategories = await Subcategory.find({ category: req.params.categoryId });
    res.json(subcategories);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch subcategories' });
  }
});

export default router;
