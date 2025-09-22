import { ProductModel } from '/opt/nodejs/models/Product.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
      },
      body: JSON.stringify({})
    };
  }

  try {
    const productModel = new ProductModel();
    const path = event.path;
    
    // Check if request is for a specific seller
    if (path.includes('/products/seller/')) {
      // Get seller ID from path parameter
      const sellerId = event.pathParameters?.id;
      
      if (!sellerId) {
        return createErrorResponse('Seller ID is required', 400);
      }
      
      // First try to use getBySeller from the model
      try {
        const products = await productModel.getBySeller(sellerId);
        return createSuccessResponse({ products });
      } catch (error) {
        console.warn('Error using getBySeller, falling back to getBySellerId:', error);
        // Fallback to getBySellerId if the index doesn't exist or other error occurs
        const products = await productModel.getBySellerId(sellerId);
        return createSuccessResponse({ products });
      }
    } 
    // Admin products view
    else if (path === '/admin/products') {
      // Get all products (can be paginated if needed)
      const products = await productModel.getAll();
      return createSuccessResponse({ products });
    }
    
    return createErrorResponse('Invalid request path', 400);
  } catch (error) {
    console.error('Error in getSellerProducts:', error);
    return createErrorResponse('Error retrieving products', 500);
  }
};