import { ProductModel } from '/opt/nodejs/models/Product.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';
import { SubcategoryModel } from '/opt/nodejs/models/subcategoryModel.js';

export const handler = async (event) => {
  try {
    // Get user info from JWT authorizer context or path parameters
    let sellerId = event.pathParameters?.id;
    
    // If no sellerId in path params, use authenticated user
    if (!sellerId) {
      sellerId = event.requestContext?.authorizer?.userId;
      
      // Still no seller ID, require authentication
      if (!sellerId) {
        return createErrorResponse('User authentication required', 401);
      }
    }

  // Get seller's products
  const productModel = new ProductModel();
  const products = await productModel.getBySellerId(sellerId);
  // Sellers see all their products, including status and active fields
    
    // Ensure consistent ID format for all products
    if (products && products.length > 0) {
      for (let i = 0; i < products.length; i++) {
        // Make sure each product has both id and _id fields for consistent access
        if (products[i].id && !products[i]._id) {
          products[i]._id = products[i].id;
        } else if (products[i]._id && !products[i].id) {
          products[i].id = products[i]._id;
        }
      }
    }
    
    // Enhance products with subcategory names
    if (products && products.length > 0) {
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        if (product.subcategory && typeof product.subcategory === 'string' && !product.subcategory.name) {
          try {
            const subcategory = await SubcategoryModel.getById(product.subcategory);
            if (subcategory) {
              product.subcategory = {
                id: product.subcategory,
                _id: product.subcategory,
                name: subcategory.name,
                description: subcategory.description
              };
            }
          } catch (error) {
            console.error('Error fetching subcategory:', error);
          }
        }
      }
    }

    return createSuccessResponse({
      products: products || []
    });

  } catch (error) {
    console.error('Get seller products error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};