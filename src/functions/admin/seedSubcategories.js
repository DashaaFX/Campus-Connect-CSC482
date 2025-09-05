import { SubcategoryModel } from '/opt/nodejs/models/subcategoryModel.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
  try {
    // Exact subcategory mapping from your MongoDB structure
    const subcategoryMap = {
      academic: ['textbooks', 'lab_manuals', 'solution_guides'],
      electronics: ['laptops', 'calculators'],
      dorm: ['minifridges', 'bedding'],
      clothing: ['formal_wear', 'winter_gear'],
      supplies: ['notebooks', 'pens'],
      sports: ['yoga_mats', 'bikes'],
      miscellaneous: ['games', 'suitcases'],
    };

    const subcategoriesData = [];
    
    // Generate subcategories for each category
    for (const [categoryId, subcategoryNames] of Object.entries(subcategoryMap)) {
      for (const name of subcategoryNames) {
        subcategoriesData.push({
          name: name,
          categoryId: categoryId,
          description: `${name.replace('_', ' ')} for ${categoryId}`
        });
      }
    }

    const createdSubcategories = [];
    
    for (const subcategoryData of subcategoriesData) {
      try {
        const subcategory = await SubcategoryModel.create(subcategoryData);
        createdSubcategories.push(subcategory);
      } catch (error) {
        // Continue if subcategory already exists
        console.log(`Subcategory ${subcategoryData.name} might already exist:`, error.message);
      }
    }

    return createSuccessResponse({
      message: 'Subcategories seeded successfully',
      count: createdSubcategories.length,
      subcategories: createdSubcategories,
      structure: subcategoryMap
    });

  } catch (error) {
    console.error('Seed subcategories error:', error);
    return createErrorResponse(error.message, 500);
  }
};
