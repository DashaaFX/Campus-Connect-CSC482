import { OrderModel } from '/opt/nodejs/models/Order.js';
import { ProductModel } from '/opt/nodejs/models/Product.js';
import { createSuccessResponse, createErrorResponse, parseJSONBody, validateRequiredFields } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
  // Handle CORS preflight requests
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
    // Get user info from JWT authorizer context
    const userId = event.requestContext?.authorizer?.userId;
    const email = event.requestContext?.authorizer?.email;
    
    if (!userId) {
      return createErrorResponse('User authentication required', 401);
    }

    const body = parseJSONBody(event.body);
    
    const requiredFields = ['productId'];
    const validation = validateRequiredFields(body, requiredFields);
    if (!validation.isValid) {
      return createErrorResponse(validation.message, 400);
    }

    // Get product information
    const productModel = new ProductModel();
    const product = await productModel.getById(body.productId);
    
    if (!product) {
      return createErrorResponse('Product not found', 404);
    }

    // Create order request
    const orderData = {
      userId: userId,
      userEmail: email,
      sellerId: product.sellerId, // Use sellerId consistently
      items: [{
        productId: body.productId,
        product: product,
        quantity: body.quantity || 1,
        price: product.price
      }],
      total: (body.quantity || 1) * product.price,
      status: 'requested',
      requestNotes: body.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const orderModel = new OrderModel();
    const order = await orderModel.create(orderData);

    const response = createSuccessResponse({
      message: 'Order request created successfully',
      order
    }, 201);
    
    // Add CORS headers
    response.headers = {
      ...response.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'POST,OPTIONS'
    };
    
    return response;

  } catch (error) {
    console.error('Create order request error:', error);
    const errorResponse = createErrorResponse(error.message, 500);
    
    // Add CORS headers to error response
    errorResponse.headers = {
      ...errorResponse.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'POST,OPTIONS'
    };
    
    return errorResponse;
  }
};
