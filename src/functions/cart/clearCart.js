import { CartModel } from '/opt/nodejs/models/Cart.js';
import { createSuccessResponse, createErrorResponse, parseJSONBody, validateRequiredFields } from '/opt/nodejs/utils/response.js';

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

    // Clear the cart
    const updates = {
      items: [],
      total: 0
    };

    const cartModel = new CartModel();
    await cartModel.update(userId, updates);

    // Get the updated cart after changes
    const updatedCart = await cartModel.getByUserId(userId);

    const response = createSuccessResponse({
      message: 'Cart cleared successfully',
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
    console.error('Clear cart error:', error);
    const errorResponse = createErrorResponse(error.message, 500);

    errorResponse.headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'DELETE,OPTIONS'
    };

    return errorResponse;
  }
};
