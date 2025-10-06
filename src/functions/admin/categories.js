//Baljinnyam Puntsagnorov
import { getCategories } from './getCategories.js';
import { getSubcategories } from './getSubcategories.js';
import { createCategory } from './createCategory.js';
import { createSubcategory } from './createSubcategory.js';
import { createErrorResponse } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
  console.log('Categories handler received:', {
    path: event.path,
    httpMethod: event.httpMethod,
    resource: event.resource
  });

  try {
    const path = event.path || event.resource;
    const method = event.httpMethod;

    if (path === '/categories' && method === 'GET') {
      return await getCategories.handler(event);
    }
    
    if (path === '/categories' && method === 'POST') {
      return await createCategory.handler(event);
    }
    
    if (path === '/subcategories' && method === 'GET') {
      return await getSubcategories.handler(event);
    }
    
    if (path === '/subcategories' && method === 'POST') {
      return await createSubcategory.handler(event);
    }

    // If no route matches
    return createErrorResponse(`Route not found: ${method} ${path}`, 404);
    
  } catch (error) {
    console.error('Categories handler error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};
