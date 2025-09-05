import { cartModel } from '/opt/nodejs/models/Cart.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
  try {
    // Get user info from JWT authorizer context
    const userId = event.requestContext?.authorizer?.userId;
    
    if (!userId) {
      return createErrorResponse('User authentication required', 401);
    }

    const productId = event.pathParameters?.productId;
    if (!productId) {
      return createErrorResponse('Product ID required', 400);
    }

    // Get current cart
    let cart = await cartModel.get(userId);
    if (!cart || !cart.items) {
      return createErrorResponse('Cart is empty', 400);
    }

    // Remove item from cart
    cart.items = cart.items.filter(item => item.productId !== productId);

    // Recalculate total
    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cart.updatedAt = new Date().toISOString();

    await cartModel.update(userId, cart);

    return createSuccessResponse({
      message: 'Item removed from cart successfully',
      cart
    });

  } catch (error) {
    console.error('Remove from cart error:', error);
    return createErrorResponse(error.message, 500);
  }
};
