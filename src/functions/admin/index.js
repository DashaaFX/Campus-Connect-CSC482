//Baljinnyam Puntsagnorov
import * as seedCategories from './seedCategories.js';
import * as seedSubcategories from './seedSubcategories.js';
import * as cleanDuplicates from './cleanDuplicates.js';
import * as getCategories from './getCategories.js';
import * as getSubcategories from './getSubcategories.js';
import * as createCategory from './createCategory.js';
import * as createSubcategory from './createSubcategory.js';
import * as productApproval from './productApproval.js';
import { createErrorResponse } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
  try {
    const path = event.path || event.resource;
    const method = event.httpMethod;

    // Handle CORS preflight requests
    if (method === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: ''
      };
    }

    // Route to appropriate handler based on path and method
    // Product approval endpoints
    if (path === '/admin/products/pending' && method === 'GET') {
      return await productApproval.listAllProducts(event);
    }
    if (path.match(/^\/admin\/products\/[\w-]+$/) && method === 'GET') {
      return await productApproval.viewProduct(event);
    }
    if (path.endsWith('/approve') && method === 'POST' && path.startsWith('/admin/products/')) {
      return await productApproval.approveProduct(event);
    }
    if (path.endsWith('/reject') && method === 'POST' && path.startsWith('/admin/products/')) {
      return await productApproval.rejectProduct(event);
    }
    
    if (path === '/admin/seed/categories' && method === 'POST') {
      return await seedCategories.handler(event);
    }
    
    if (path === '/admin/seed/subcategories' && method === 'POST') {
      return await seedSubcategories.handler(event);
    }
    
    if (path === '/admin/clean-duplicates' && method === 'POST') {
      return await cleanDuplicates.handler(event);
    }
    // Category management routes
    if (path === '/categories' && method === 'GET') {
      return await getCategories.handler(event);
    }
    
    if (path === '/admin/categories' && method === 'POST') {
      return await createCategory.handler(event);
    }
    
    if (path === '/subcategories' && method === 'GET') {
      return await getSubcategories.handler(event);
    }
    
    if (path.includes('/categories/') && path.includes('/subcategories') && method === 'GET') {
      return await getSubcategories.handler(event);
    }
    
    if (path === '/admin/subcategories' && method === 'POST') {
      return await createSubcategory.handler(event);
    }

    // If no route matches
    return createErrorResponse(`Route not found: ${method} ${path}`, 404);
    
  } catch (error) {
    console.error('Admin handler error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};
