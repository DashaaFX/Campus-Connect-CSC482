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
        'Access-Control-Allow-Methods': 'PUT,OPTIONS'
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

    const productId = event.pathParameters?.productId;
    if (!productId) {
      return createErrorResponse('Product ID required', 400);
    }

    const body = parseJSONBody(event.body);
    const requiredFields = ['quantity'];
    const validation = validateRequiredFields(body, requiredFields);
    if (!validation.isValid) {
      return createErrorResponse(validation.message, 400);
    }

    const { quantity } = body;

    // Validate quantity
    if (quantity <= 0) {
      return createErrorResponse('Quantity must be greater than 0', 400);
    }

    // Get current cart
    const cartModel = new CartModel();
    let cart = await cartModel.getByUserId(userId);
    if (!cart || !cart.items) {
      return createErrorResponse('Cart is empty', 400);
    }

    // Find and update item
    const itemIndex = cart.items.findIndex(item => item.productId === productId);
    if (itemIndex === -1) {
      return createErrorResponse('Item not found in cart', 404);
    }

    cart.items[itemIndex].quantity = quantity;

    // Recalculate total
    cart.total = cart.items.reduce((sum, item) => {
      const price = item.product?.price || item.price || 0;
      return sum + (price * item.quantity);
    }, 0);

    await cartModel.update(userId, cart);

    const response = createSuccessResponse({
      message: 'Cart item updated successfully',
      cart
    });

    response.headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'PUT,OPTIONS'
    };

    return response;

  } catch (error) {
    console.error('Update cart item error:', error);
    const errorResponse = createErrorResponse(error.message, 500);

    errorResponse.headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'PUT,OPTIONS'
    };

    return errorResponse;
  }
};
