import { orderModel } from '/opt/nodejs/models/Order.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
  try {
    // Get user info from JWT authorizer context
    const userId = event.requestContext?.authorizer?.userId;
    
    if (!userId) {
      return createErrorResponse('User authentication required', 401);
    }

    const orders = await orderModel.getByUserId(userId);

    return createSuccessResponse({
      orders: orders || []
    });

  } catch (error) {
    console.error('Get orders error:', error);
    return createErrorResponse(error.message, 500);
  }
};
