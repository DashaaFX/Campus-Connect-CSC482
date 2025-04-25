// seed/categorySeed.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Category } from '../models/category.model.js';
import { Subcategory } from '../models/subcategory.model.js';
import connectDB from '../utils/db.js';

dotenv.config();

const seedData = async () => {
  await connectDB();

  await Category.deleteMany();
  await Subcategory.deleteMany();

  const categoryData = [
    { name: 'academic' },
    { name: 'electronics' },
    { name: 'dorm' },
    { name: 'clothing' },
    { name: 'supplies' },
    { name: 'sports' },
    { name: 'miscellaneous' },
  ];

  const categories = await Category.insertMany(categoryData);

  const subcategoryMap = {
    academic: ['textbooks', 'lab_manuals', 'solution_guides'],
    electronics: ['laptops', 'calculators'],
    dorm: ['minifridges', 'bedding'],
    clothing: ['formal_wear', 'winter_gear'],
    supplies: ['notebooks', 'pens'],
    sports: ['yoga_mats', 'bikes'],
    miscellaneous: ['games', 'suitcases'],
  };

  const subcategories = [];
  for (const cat of categories) {
    const names = subcategoryMap[cat.name];
    for (const name of names) {
      subcategories.push({ name, category: cat._id });
    }
  }

  await Subcategory.insertMany(subcategories);
  console.log('Seeded categories and subcategories');
  process.exit();
};

seedData();
