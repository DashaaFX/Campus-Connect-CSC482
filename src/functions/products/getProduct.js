import { productModel } from '/opt/nodejs/models/Product.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
  try {
    const productId = event.pathParameters?.productId;
    
    if (!productId) {
      return createErrorResponse('Product ID is required', 400);
    }

    const product = await productModel.getById(productId);
    
    if (!product) {
      return createErrorResponse('Product not found', 404);
    }

    return createSuccessResponse({ product });

  } catch (error) {
    console.error('Get product error:', error);
    return createErrorResponse(error.message, 500);
  }
};
