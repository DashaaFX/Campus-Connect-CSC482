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

    return createSuccessResponse(subcategories);
  } catch (error) {
    console.error('Get subcategories error:', error);
    return createErrorResponse(error.message, 500);
  }
};
