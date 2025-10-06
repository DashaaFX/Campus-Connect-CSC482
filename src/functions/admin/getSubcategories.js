//Baljinnyam Puntsagnorov
import { SubcategoryModel } from '/opt/nodejs/models/subcategoryModel.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
  try {
    const { categoryId } = event.pathParameters || {};
    
    let subcategories;
    if (categoryId) {
      // Get subcategories for a specific category
      subcategories = await SubcategoryModel.getByCategoryId(categoryId);
    } else {
      // Get all subcategories
      subcategories = await SubcategoryModel.getAll();
    }

    // Ensure subcategories is an array
    const subcategoriesArray = Array.isArray(subcategories) ? subcategories : Object.values(subcategories || {});

    return createSuccessResponse({
      subcategories: subcategoriesArray,
      data: subcategoriesArray // For backward compatibility
    });
  } catch (error) {
    console.error('Get subcategories error:', error);
    return createErrorResponse(error.message, 500);
  }
};
