import { ProductModel } from '/opt/nodejs/models/Product.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';
import { SubcategoryModel } from '/opt/nodejs/models/subcategoryModel.js';

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
    const productId = event.pathParameters?.id;
    
    if (!productId) {
      return createErrorResponse('Product ID is required', 400);
    }

    const productModel = new ProductModel();
    console.log(`Fetching product with ID: ${productId}`);
    
    // Try to get the product by ID
    let product = await productModel.getById(productId);
    
    // If not found, try using different ID formats
    if (!product) {
      console.log(`Product not found with direct ID, trying alternative ID formats`);
      
      // Get all products and find match by _id or id
      const allProducts = await productModel.getAll();
      product = allProducts.find(p => 
        p.id === productId || 
        p._id === productId ||
        p.id?.toString() === productId.toString() || 
        p._id?.toString() === productId.toString()
      );
      
      if (product) {
        console.log(`Found product using alternative ID match: ${product.id || product._id}`);
      }
    }
    
    if (!product) {
      return createErrorResponse('Product not found', 404);
    }
    
    // Enhance product with subcategory name if it exists as an ID
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

    const response = createSuccessResponse({ product });
    
    // Add CORS headers
    response.headers = {
      ...response.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,OPTIONS'
    };
    
    return response;

  } catch (error) {
    console.error('Get product error:', error);
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
