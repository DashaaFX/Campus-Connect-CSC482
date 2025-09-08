import { ProductModel } from '/opt/nodejs/models/Product.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';
import { SubcategoryModel } from '/opt/nodejs/models/subcategoryModel.js';

// Create product model instance
const productModel = new ProductModel();

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
    const queryParams = event.queryStringParameters || {};
    const { category, seller, search, limit, lastEvaluatedKey } = queryParams;

    let products;
    
    if (search) {
      // Search products with optional category filter
      products = await productModel.search(search, category);
    } else if (seller) {
      // Get products by seller
      products = await productModel.getBySeller(seller);
    } else if (category) {
      // Get products by category
      products = await productModel.getByCategory(category);
    } else {
      // Get all products
      products = await productModel.getAll();
    }
    
    // Filter out any null or undefined products
    products = products.filter(product => !!product);

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
            console.error('Error fetching subcategory for product:', product.id, error);
            // Keep original subcategory ID if error occurs
          }
        }
      }
    }
    
    const response = createSuccessResponse({
      products: products,
      count: products.length
    });
    
    // Add CORS headers
    response.headers = {
      ...response.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,OPTIONS'
    };
    
    return response;

  } catch (error) {
    console.error('Get products error:', error);
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
