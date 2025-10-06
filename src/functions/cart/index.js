//Baljinnyam Puntsagnorov
import * as getCart from './getCart.js';
import * as addToCart from './addToCart.js';
import * as updateCartItem from './updateCartItem.js';
import * as removeFromCart from './removeFromCart.js';
import * as clearCart from './clearCart.js';
import { createErrorResponse } from '/opt/nodejs/utils/response.js';

const cartHandler = async (event) => {
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
  const errorResponse = createErrorResponse(`Route not found: ${method} ${path}`, 404);
  errorResponse.headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,PUT,OPTIONS'
  };
  return errorResponse;
};

export const handler = cartHandler;
