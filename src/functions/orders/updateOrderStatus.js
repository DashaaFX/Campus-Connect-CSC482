import { orderModel } from '/opt/nodejs/models/Order.js';
import { createSuccessResponse, createErrorResponse, parseJSONBody, validateRequiredFields } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
  try {
    // Get user info from JWT authorizer context
    const userId = event.requestContext?.authorizer?.userId;
    
    if (!userId) {
      return createErrorResponse('User authentication required', 401);
    }

    const orderId = event.pathParameters?.id;
    if (!orderId) {
      return createErrorResponse('Order ID required', 400);
    }

    const body = parseJSONBody(event.body);
    const requiredFields = ['status'];
    const validation = validateRequiredFields(body, requiredFields);
    if (!validation.isValid) {
      return createErrorResponse(validation.message, 400);
    }

    const { status } = body;
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return createErrorResponse('Invalid status. Must be one of: ' + validStatuses.join(', '), 400);
    }

    // Get existing order to verify ownership
    const existingOrder = await orderModel.get(orderId);
    if (!existingOrder) {
      return createErrorResponse('Order not found', 404);
    }

    // Check authorization - only buyer can cancel, sellers can update other statuses
    const isBuyer = existingOrder.userId === userId;
    const isSeller = existingOrder.items && existingOrder.items.some(item => 
      item.sellerId === userId
    );

    if (!isBuyer && !isSeller) {
      return createErrorResponse('Not authorized to update this order', 403);
    }

    // Buyers can only cancel orders
    if (isBuyer && !isSeller && status !== 'cancelled') {
      return createErrorResponse('Buyers can only cancel orders', 403);
    }

    const updateData = {
      status,
      updatedAt: new Date().toISOString(),
      statusUpdatedBy: userId
    };

    const updatedOrder = await orderModel.update(orderId, updateData);

    return createSuccessResponse({
      message: 'Order status updated successfully',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Update order status error:', error);
    return createErrorResponse(error.message, 500);
  }
};
