import { orderModel } from '/opt/nodejs/models/Order.js';
import { createSuccessResponse, createErrorResponse, parseJSONBody, validateRequiredFields } from '/opt/nodejs/utils/response.js';
import { ORDER_STATUS_LIST } from '/opt/nodejs/constants/orderStatus.js';

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
  const validStatuses = ORDER_STATUS_LIST;
    
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
    const isSeller = (existingOrder.sellerId === userId) || 
                     (existingOrder.items && existingOrder.items.some(item => 
                       (item.sellerId === userId) || 
                       (item.product && item.product.sellerId === userId)
                     ));

    if (!isBuyer && !isSeller) {
      return createErrorResponse('Not authorized to update this order', 403);
    }

    // Buyers can only cancel orders that are not already completed or shipped
    if (isBuyer && !isSeller) {
      if (status !== 'cancelled') {
        return createErrorResponse('Buyers can only cancel orders', 403);
      }
      
      if (['completed', 'shipped'].includes(existingOrder.status)) {
        return createErrorResponse('Cannot cancel order that has been shipped or completed', 403);
      }
    }

    const updateData = {
      status,
      statusUpdatedBy: userId,
      statusUpdatedAt: new Date().toISOString()
    };
    
    //track the order state changes
    const prevStatus = existingOrder.status;
    const updatedOrder = await orderModel.update(orderId, updateData);

    // Unlock digital downloads when moving into completed
    if (status === 'completed' && prevStatus !== 'completed') {
      try {
      } catch (e) {
        console.error('Entitlement unlock hook error:', e);
      }
    }

    return createSuccessResponse({
      message: 'Order status updated successfully',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Update order status error:', error);
    return createErrorResponse(error.message, 500);
  }
};
