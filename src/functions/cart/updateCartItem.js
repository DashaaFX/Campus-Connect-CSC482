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

    // The API route uses {id} as the parameter, extract it directly
    let productId = event.pathParameters?.id;
    
    // If not found in path parameters, try to get from body as a fallback
    if (!productId) {
      try {
        const bodyContent = typeof event.body === 'object' ? 
          event.body : 
          (event.body ? parseJSONBody(event.body) : null);
          
        productId = bodyContent?.productId;
      } catch (e) {
        // Silently continue if body parsing fails
      }
    }
    
    if (!productId) {
      return createErrorResponse('Product ID required', 400);
    }

    // Parse body if we haven't already
    let body;
    try {
      if (!event.body) {
        return createErrorResponse('Request body is required', 400);
      }
      
      if (typeof event.body === 'object') {
        body = event.body;
      } else if (typeof event.body === 'string') {
        body = parseJSONBody(event.body);
      } else {
        return createErrorResponse('Invalid request body format', 400);
      }
    } catch (error) {
      return createErrorResponse('Invalid request body', 400);
    }

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

    // Only send the fields that need updating, not the whole cart object
    await cartModel.update(userId, {
      items: cart.items,
      total: cart.total
    });

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
