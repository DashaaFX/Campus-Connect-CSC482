import { CartModel } from '/opt/nodejs/models/Cart.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'DELETE,OPTIONS'
      },
      body: JSON.stringify({})
    };
  }

  try {
    // Get user info from JWT authorizer context
    const userId = event.requestContext?.authorizer?.userId;

    if (!userId) {
      return createErrorResponse('User authentication required', 401);
    }

    const productId = event.pathParameters?.productId || event.pathParameters?.id;
    if (!productId) {
      return createErrorResponse('Product ID required', 400);
    }

    // Get current cart
    const cartModel = new CartModel();
    let cart = await cartModel.getByUserId(userId);
    if (!cart || !cart.items) {
      return createErrorResponse('Cart is empty', 400);
    }

    // Remove item from cart
    const updatedItems = cart.items.filter(item => item.productId !== productId);

    // Recalculate total
    const updatedTotal = updatedItems.reduce((sum, item) => {
      const price = item.product?.price || item.price || 0;
      return sum + (price * item.quantity);
    }, 0);

    const updates = {
      items: updatedItems,
      total: updatedTotal
    };

    await cartModel.update(userId, updates);

    // Get the updated cart after changes
    const updatedCart = await cartModel.getByUserId(userId);

    const response = createSuccessResponse({
      message: 'Item removed from cart successfully',
      cart: updatedCart,
      items: updatedCart.items || [] // Ensure items are returned for frontend compatibility
    });

    response.headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'DELETE,OPTIONS'
    };

    return response;

  } catch (error) {
    console.error('Remove from cart error:', error);
    const errorResponse = createErrorResponse(error.message, 500);

    errorResponse.headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'DELETE,OPTIONS'
    };

    return errorResponse;
  }
};
