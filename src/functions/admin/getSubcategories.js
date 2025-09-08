import { SubcategoryModel } from '/opt/nodejs/models/subcategoryModel.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
  try {
    console.log('GetSubcategories event:', JSON.stringify(event, null, 2));
    const { categoryId } = event.pathParameters || {};
    
    console.log('Looking for subcategories with categoryId:', categoryId);
    
    let subcategories;
    if (categoryId) {
      // Get subcategories for a specific category
      subcategories = await SubcategoryModel.getByCategoryId(categoryId);
    } else {
      // Get all subcategories
      subcategories = await SubcategoryModel.getAll();
    }

    console.log('Found subcategories:', JSON.stringify(subcategories, null, 2));

    // Ensure subcategories is an array
    const subcategoriesArray = Array.isArray(subcategories) ? subcategories : Object.values(subcategories || {});
    
    console.log('Converted to array:', JSON.stringify(subcategoriesArray, null, 2));

    return createSuccessResponse({
      subcategories: subcategoriesArray,
      data: subcategoriesArray // For backward compatibility
    });
  } catch (error) {
    console.error('Get subcategories error:', error);
    return createErrorResponse(error.message, 500);
  }
};
