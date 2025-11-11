import { OrderModel } from '/opt/nodejs/models/Order.js';
import { ProductModel } from '/opt/nodejs/models/Product.js';
import { createSuccessResponse, createErrorResponse, parseJSONBody, validateRequiredFields } from '/opt/nodejs/utils/response.js';
import { ORDER_STATUSES, OPEN_ORDER_STATUSES } from '/opt/nodejs/constants/orderStatus.js';
// Notification publisher (firebase-admin)
import { notifyOrderRequested } from '/opt/nodejs/services/notifications.js';
import { CartModel } from '/opt/nodejs/models/Cart.js';

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

    const derivedSellerId = product.sellerId || product.userId;
    if (product && !product.sellerId && product.userId) {
      product.sellerId = product.userId; // normalize snapshot
    }

    // Prevent duplicate open order for same buyer/product
    const orderModel = new OrderModel();
    const existingOrders = await orderModel.getByBuyer(userId);
    const duplicate = existingOrders?.find(o => o.items?.some(it => {
      const pid = it.productId || it.product?.id || it.product?._id;
      return pid === body.productId;
    }) && OPEN_ORDER_STATUSES.includes(o.status));
    if (duplicate) {
      return createErrorResponse('An active order for this product already exists.', 409);
    }

    // Create order request (single-item order)
    const orderData = {
      userId: userId,
      userEmail: email,
      sellerId: derivedSellerId, // For SellerIndex
      items: [{
        productId: body.productId,
        product: product,
        quantity: body.quantity || 1,
        price: product.price,
        sellerId: derivedSellerId
      }],
      products: [{
        productId: body.productId,
        status: ORDER_STATUSES.REQUESTED,
        quantity: body.quantity || 1,
        sellerId: derivedSellerId
      }],
      total: (body.quantity || 1) * product.price,
      status: ORDER_STATUSES.REQUESTED,
      timeline: [
        { at: new Date().toISOString(), type: 'requested', actor: userId }
      ],
      requestNotes: body.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  //notifications for order request
  //did not implement this, as notifications for order request were not working
  const order = await orderModel.create(orderData);
  try { await notifyOrderRequested(order); } catch {/* ignore */}

    // Remove or decrement the item from the user's cart 
    try {
      const cartModel = new CartModel();
      const cart = await cartModel.getByUserId(userId);
      if (cart && Array.isArray(cart.items)) {
        const remaining = cart.items.filter(it => it.productId !== body.productId);
        if (remaining.length !== cart.items.length) {
          await cartModel.update(userId, { items: remaining, total: remaining.reduce((sum, it) => {
            const price = it.product?.price || it.price || 0; return sum + price * (it.quantity || 1);
          }, 0) });
        }
      }
    } catch (_) {  } // temporary silent failure

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
