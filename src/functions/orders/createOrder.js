import { orderModel } from '/opt/nodejs/models/Order.js';
import { cartModel } from '/opt/nodejs/models/Cart.js';
import { createSuccessResponse, createErrorResponse, parseJSONBody, validateRequiredFields } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
  try {
    // Get user info from JWT authorizer context
    const userId = event.requestContext?.authorizer?.userId;
    const email = event.requestContext?.authorizer?.email;
    
    if (!userId) {
      return createErrorResponse('User authentication required', 401);
    }

    const body = parseJSONBody(event.body);
    
    const requiredFields = ['shippingAddress'];
    const validation = validateRequiredFields(body, requiredFields);
    if (!validation.isValid) {
      return createErrorResponse(validation.message, 400);
    }

    // Get user's cart
    const cart = await cartModel.get(userId);
    if (!cart || !cart.items || cart.items.length === 0) {
      return createErrorResponse('Cart is empty', 400);
    }

    const orderData = {
      userId: userId,
      userEmail: email,
      items: cart.items,
      total: cart.total,
      shippingAddress: body.shippingAddress,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const order = await orderModel.create(orderData);

    // Clear the cart after successful order
    await cartModel.update(userId, { userId: userId, items: [], total: 0 });

    return createSuccessResponse({
      message: 'Order created successfully',
      order
    }, 201);

  } catch (error) {
    console.error('Create order error:', error);
    return createErrorResponse(error.message, 500);
  }
};
