import { cartModel } from '/opt/nodejs/models/Cart.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
  try {
    // Get user info from JWT authorizer context
    const userId = event.requestContext?.authorizer?.userId;
    
    if (!userId) {
      return createErrorResponse('User authentication required', 401);
    }

    // Clear the cart
    const emptyCart = {
      userId: userId,
      items: [],
      total: 0,
      updatedAt: new Date().toISOString()
    };

    await cartModel.update(userId, emptyCart);

    return createSuccessResponse({
      message: 'Cart cleared successfully',
      cart: emptyCart
    });

  } catch (error) {
    console.error('Clear cart error:', error);
    return createErrorResponse(error.message, 500);
  }
};
