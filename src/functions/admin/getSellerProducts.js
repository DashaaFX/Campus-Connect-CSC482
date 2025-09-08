import { ProductModel } from '/opt/nodejs/models/Product.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';
import { SubcategoryModel } from '/opt/nodejs/models/subcategoryModel.js';

export const handler = async (event) => {
  try {
    console.log('GetSellerProducts event:', JSON.stringify(event, null, 2));
    
    // Check if this is a CORS preflight request
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

    // Get user info from JWT authorizer context or path parameters
    let sellerId = event.pathParameters?.sellerId;
    
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
    
    console.log(`Found ${products?.length || 0} products for seller ${sellerId}`);
    
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
            // Keep original subcategory ID if error occurs
          }
        }
      }
    }

    const response = createSuccessResponse({
      products: products || []
    });
    
    // Add CORS headers to the response
    response.headers = {
      ...response.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,OPTIONS'
    };

    return response;

  } catch (error) {
    console.error('Get seller products error:', error);
    const errorResponse = createErrorResponse(error.message, 500);
    
    // Add CORS headers to error response too
    errorResponse.headers = {
      ...errorResponse.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,OPTIONS'
    };
    
    return errorResponse;
  }
};
