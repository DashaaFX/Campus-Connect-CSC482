import { OrderModel, orderModel } from '/opt/nodejs/models/Order.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
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

    // Check if this is a seller orders request
    const isSeller = event.path === '/orders/seller-orders';
    
    let orders = [];
    
    if (isSeller) {
      // Get orders where the user is the seller
      console.log(`Fetching seller orders for user ${userId}`);
      orders = await orderModel.getBySeller(userId);
      console.log(`Found ${orders?.length || 0} seller orders for user ${userId}`);
    } else {
      // Get orders where the user is the buyer
      console.log(`Fetching buyer orders for user ${userId} using UserIndex`);
      orders = await orderModel.getByBuyer(userId);
      console.log(`Found ${orders?.length || 0} buyer orders for user ${userId}`);
    }

    const response = createSuccessResponse({
      orders: orders || [],
      isSeller: isSeller
    });
    
    // Add CORS headers
    response.headers = {
      ...response.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,OPTIONS'
    };
    
    return response;

  } catch (error) {
    console.error('Get orders error:', error);
    const errorResponse = createErrorResponse(error.message, 500);
    
    // Add CORS headers to error response
    errorResponse.headers = {
      ...errorResponse.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,OPTIONS'
    };
    
    return errorResponse;
  }
};
