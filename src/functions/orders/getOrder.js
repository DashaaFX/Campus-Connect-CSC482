import { orderModel } from '/opt/nodejs/models/Order.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
  try {
    // Get user info from JWT authorizer context
    const userId = event.requestContext?.authorizer?.userId;
    
    if (!userId) {
      return createErrorResponse('User authentication required', 401);
    }

    // Order retrieval by ID
    const orderId = event.pathParameters?.id;
    if (!orderId) {
      return createErrorResponse('Order ID required', 400);
    }

    const order = await orderModel.get(orderId); // alias to getById in model
    if (!order) {
      return createErrorResponse('Order not found', 404);
    }

    // Users can only view their own orders (as buyer or seller)
    if (order.userId !== userId && order.sellerId !== userId) {
      return createErrorResponse('Not authorized to view this order', 403);
    }

    return createSuccessResponse({ order });

  } catch (error) {
    console.error('Get order error:', error);
    return createErrorResponse(error.message, 500);
  }
};
