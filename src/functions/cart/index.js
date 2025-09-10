import * as getCart from './getCart.js';
import * as addToCart from './addToCart.js';
import * as updateCartItem from './updateCartItem.js';
import * as removeFromCart from './removeFromCart.js';
import * as clearCart from './clearCart.js';
import { createErrorResponse } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
  try {
    const path = event.path || event.resource;
    const method = event.httpMethod;

    // Route to appropriate handler based on path and method
    if (path === '/cart' && method === 'GET') {
      return await getCart.handler(event);
    }
    
    if ((path === '/cart' || path === '/cart/add') && method === 'POST') {
      return await addToCart.handler(event);
    }
    
    if (path.includes('/cart/') && method === 'PUT') {
      return await updateCartItem.handler(event);
    }
    
    if (path === '/cart/clear' && method === 'DELETE') {
      return await clearCart.handler(event);
    }
    
    if (path.includes('/cart/') && method === 'DELETE') {
      return await removeFromCart.handler(event);
    }

    // If no route matches
    return createErrorResponse(`Route not found: ${method} ${path}`, 404);
    
  } catch (error) {
    console.error('Cart handler error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};
