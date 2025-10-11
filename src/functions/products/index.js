import * as getProducts from './getProducts.js';
import * as getProduct from './getProduct.js';
import * as createProduct from './createProduct.js';
import * as updateProduct from './updateProduct.js';
import * as deleteProduct from './deleteProduct.js';
import * as downloadDigitalProduct from './downloadDigitalProduct.js';
import * as getSellerProducts from './getSellerProducts.js';
import { createErrorResponse } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
  try {
    const path = event.path || event.resource;
    const method = event.httpMethod;

    if (method === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify({})
      };
    }

    // Route to appropriate handler based on path and method
    if (path === '/products' && method === 'GET') {
      return await getProducts.handler(event);
    }
    
    if (path.includes('/products/') && !path.includes('/seller/') && method === 'GET') {
      // Special case: download route ends with /download
      if (path.endsWith('/download')) {
        return await downloadDigitalProduct.handler(event);
      }
      return await getProduct.handler(event);
    }
    
    if (path.includes('/products/seller/') && method === 'GET') {
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
    const notFound = createErrorResponse(`Route not found: ${method} ${path}`, 404);
    notFound.headers = {
      ...notFound.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    };
    return notFound;
    
  } catch (error) {
    console.error('Products handler error:', error);
    const err = createErrorResponse('Internal server error', 500);
    err.headers = {
      ...err.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    };
    return err;
  }
};
