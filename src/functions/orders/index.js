import * as createOrder from './createOrder.js';
import * as requestOrder from './requestOrder.js';
import * as getOrders from './getOrders.js';
import * as getOrder from './getOrder.js';
import * as updateOrderStatus from './updateOrderStatus.js';
import * as markPaid from './markPaid.js';
import * as createCheckoutSession from './createCheckoutSession.js';
import { createErrorResponse } from '/opt/nodejs/utils/response.js';
import * as refundOrder from './refundOrder.js';
import * as deleteOrder from './deleteOrder.js';
// Fixed incorrect filename (was archiveOrders.js) causing Lambda ERR_MODULE_NOT_FOUND
import * as archiveOrder from './archiveOrder.js';

export const handler = async (event) => {
    
  try {
    const path = event.path || event.resource;
    const method = event.httpMethod;

    // Route to appropriate handler based on path and method
    if (path === '/orders' && method === 'POST') {
      return await createOrder.handler(event);
    }

    if (path.includes('/orders/') && method === 'OPTIONS') {
      return await deleteOrder.handler(event);
    }

    if (path.includes('/orders/') && method === 'DELETE') {
      return await deleteOrder.handler(event);
    }
    
    if (path === '/orders/request' && method === 'POST') {
      return await requestOrder.handler(event);
    }

    if (path.includes('/orders/archive')) {
      return await archiveOrder.handler(event);
    }
    
    if ((path === '/orders' || path === '/orders/my-orders' || path === '/orders/seller-orders') && method === 'GET') {
      return await getOrders.handler(event);
    }
    
    if (path.includes('/orders/') && !path.includes('/status') && method === 'GET') {
      return await getOrder.handler(event);
    }
    
    if (path.includes('/orders/') && path.includes('/status') && method === 'PUT') {
      return await updateOrderStatus.handler(event);
    }

    if (path.includes('/orders/') && path.includes('/mark-paid') && method === 'POST') {
      return await markPaid.handler(event);
    }


    if (path.includes('/orders/') && path.includes('/checkout-session') && method === 'POST') {
      return await createCheckoutSession.handler(event);
    }
    if (path.includes('/orders/') && path.includes('/refund') && method === 'POST') {
      return await refundOrder.handler(event);
    }

    // If no route matches
    return createErrorResponse(`Route not found: ${method} ${path}`, 404);
    
  } catch (error) {
    console.error('Orders handler error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};
