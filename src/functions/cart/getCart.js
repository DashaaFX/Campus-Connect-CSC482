import { cartModel } from '/opt/nodejs/models/Cart.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
  try {
    // Get user info from JWT authorizer context
    const userId = event.requestContext?.authorizer?.userId;
    
    if (!userId) {
      return createErrorResponse('User authentication required', 401);
    }

    const cart = await cartModel.get(userId);

    return createSuccessResponse({
      cart: cart || { items: [], total: 0 }
    });

  } catch (error) {
    console.error('Get cart error:', error);
    return createErrorResponse(error.message, 500);
  }
};
