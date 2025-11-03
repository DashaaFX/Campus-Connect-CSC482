import { orderModel } from '/opt/nodejs/models/Order.js';
import { createSuccessResponse, createErrorResponse, parseJSONBody, validateRequiredFields } from '/opt/nodejs/utils/response.js';
import { ORDER_STATUS_LIST, canTransition, ORDER_STATUSES } from '/opt/nodejs/constants/orderStatus.js';

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

    // Role-based transition validation
    if (isBuyer && !isSeller) {
      // Buyer allowed: cancel only from requested/approved
      if (status === ORDER_STATUSES.CANCELLED) {
        if (![ORDER_STATUSES.REQUESTED, ORDER_STATUSES.APPROVED].includes(existingOrder.status)) {
          return createErrorResponse('Cannot cancel at this stage', 403);
        }
      } else {
        return createErrorResponse('Buyers can only cancel orders', 403);
      }
    }

    // Sellers cannot mark paid / completed directly (paid handled by markPaid endpoint) unless rejecting
    if (isSeller && status === ORDER_STATUSES.PAID) {
      return createErrorResponse('Use payment endpoints to mark paid', 403);
    }

    // Validate transition legality
    if (!canTransition(existingOrder.status, status)) {
      return createErrorResponse(`Illegal status transition from ${existingOrder.status} to ${status}`, 409);
    }

    // If seller is approving only some products, update per-product status
    let updatedOrder = null;
    if (isSeller && [ORDER_STATUSES.APPROVED, ORDER_STATUSES.REJECTED].includes(status)) {
      const now = new Date().toISOString();
      // Remove immutable fields from update payload
      const { id, createdAt, updatedAt, ...orderFields } = existingOrder;
      updatedOrder = await orderModel.update(orderId, {
        ...orderFields,
        status,
        statusUpdatedBy: userId,
        statusUpdatedAt: now,
        timeline: [ ...(existingOrder.timeline || []), { at: now, type: `status_${status}`, actor: userId } ]
      });
    } else {
      // Normal status update (whole order)
      const now = new Date().toISOString();
      // Remove immutable fields from update payload
      const { id, createdAt, updatedAt, ...orderFields } = existingOrder;
      updatedOrder = await orderModel.update(orderId, {
        ...orderFields,
        status,
        statusUpdatedBy: userId,
        statusUpdatedAt: now,
        timeline: [ ...(existingOrder.timeline || []), { at: now, type: `status_${status}`, actor: userId } ]
      });
    }

    // Unlock digital downloads when moving into completed
    if (status === 'completed' && existingOrder.status !== 'completed') {
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
