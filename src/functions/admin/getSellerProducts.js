import { productModel } from '/opt/nodejs/models/Product.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
  try {
    // Get user info from JWT authorizer context
    const userId = event.requestContext?.authorizer?.userId;
    
    if (!userId) {
      return createErrorResponse('User authentication required', 401);
    }

    // Get seller's products
    const products = await productModel.getBySellerId(userId);

    return createSuccessResponse({
      products: products || []
    });

  } catch (error) {
    console.error('Get seller products error:', error);
    return createErrorResponse(error.message, 500);
  }
};
