import { productModel } from '/opt/nodejs/models/Product.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
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

    return createSuccessResponse({
      products: products,
      count: products.length
    });

  } catch (error) {
    console.error('Get products error:', error);
    return createErrorResponse(error.message, 500);
  }
};
