import { cartModel } from '/opt/nodejs/models/Cart.js';
import { createSuccessResponse, createErrorResponse, parseJSONBody, validateRequiredFields } from '/opt/nodejs/utils/response.js';

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
    let cart = await cartModel.get(userId);
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
    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cart.updatedAt = new Date().toISOString();

    await cartModel.update(userId, cart);

    return createSuccessResponse({
      message: 'Cart item updated successfully',
      cart
    });

  } catch (error) {
    console.error('Update cart item error:', error);
    return createErrorResponse(error.message, 500);
  }
};
