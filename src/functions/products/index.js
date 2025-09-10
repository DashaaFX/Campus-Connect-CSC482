import * as getProducts from './getProducts.js';
import * as getProduct from './getProduct.js';
import * as createProduct from './createProduct.js';
import * as updateProduct from './updateProduct.js';
import * as deleteProduct from './deleteProduct.js';
import { createErrorResponse } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
  try {
    const path = event.path || event.resource;
    const method = event.httpMethod;

    // Route to appropriate handler based on path and method
    if (path === '/products' && method === 'GET') {
      return await getProducts.handler(event);
    }
    
    if (path.includes('/products/') && !path.includes('/seller/') && method === 'GET') {
      return await getProduct.handler(event);
    }
    
    if (path.includes('/products/seller/') && method === 'GET') {
      // Import and use the getSellerProducts function
      const { getSellerProducts } = await import('../../admin/getSellerProducts.js');
      return await getSellerProducts.handler(event);
    }
    
    if (path === '/products' && method === 'POST') {
      return await createProduct.handler(event);
    }
    
    if (path.includes('/products/') && method === 'PUT') {
      return await updateProduct.handler(event);
    }
    
    if (path.includes('/products/') && method === 'DELETE') {
      return await deleteProduct.handler(event);
    }

    // If no route matches
    return createErrorResponse(`Route not found: ${method} ${path}`, 404);
    
  } catch (error) {
    console.error('Products handler error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};
