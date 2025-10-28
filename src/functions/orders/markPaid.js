import { orderModel } from '/opt/nodejs/models/Order.js';
import { ProductModel } from '/opt/nodejs/models/Product.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';
import { ORDER_STATUSES } from '/opt/nodejs/constants/orderStatus.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: JSON.stringify({})
    };
  }
  try {
    const userId = event.requestContext?.authorizer?.userId;
    if (!userId) return createErrorResponse('User authentication required', 401);
    const orderId = event.pathParameters?.id;
    if (!orderId) return createErrorResponse('Order ID required', 400);

    const order = await orderModel.get(orderId);
    if (!order) return createErrorResponse('Order not found', 404);
    if (order.userId !== userId) return createErrorResponse('Only buyer can mark payment', 403);
    if (order.status !== ORDER_STATUSES.APPROVED) return createErrorResponse('Order must be approved to mark paid', 409);

    // Determine digital product status
    const firstItem = order.items?.[0];
    const productModel = new ProductModel();
    let product = null;
    if (firstItem) {
      const pid = firstItem.productId || firstItem.product?.id || firstItem.product?._id;
      if (pid) product = await productModel.getById(pid);
    }
    const isDigital = !!product?.isDigital;

    const now = new Date().toISOString();
    // Transition APPROVED -> PAID
    const updated = await orderModel.update(orderId, {
      status: ORDER_STATUSES.PAID,
      updatedAt: now,
      paymentMarkedAt: now,
      timeline: [ ...(order.timeline || []), { at: now, type: 'payment_marked', actor: userId } ]
    });

    // Auto-complete digital orders (fast path)
    let finalOrder = updated;
    if (isDigital) {
      const now2 = new Date().toISOString();
      finalOrder = await orderModel.update(orderId, {
        status: ORDER_STATUSES.COMPLETED,
        completedAt: now2,
        timeline: [ ...(updated.timeline || []), { at: now2, type: 'completed', actor: 'system' } ]
      });
          timeline: [ ...(updated.timeline || []), { at: now2, type: 'completed', actor: 'system' } ]
    }

    const resp = createSuccessResponse({
      message: 'Order payment recorded successfully',
      order: finalOrder,
      autoCompleted: isDigital
    });
    resp.headers = {
      ...resp.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'POST,OPTIONS'
    };
    return resp;
  } catch (error) {
    console.error('Mark paid error:', error);
    const err = createErrorResponse(error.message, 500);
    err.headers = {
      ...err.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'POST,OPTIONS'
    };
    return err;
  }
};
