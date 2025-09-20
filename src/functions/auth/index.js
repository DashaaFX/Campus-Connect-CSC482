import * as register from './register.js';
import * as login from './login.js';
import * as updateProfilePicture from './updateProfilePicture.js';
import { createErrorResponse } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
  try {
    const path = event.path || event.resource;
    const method = event.httpMethod;

    // Route to appropriate handler based on path and method
    if (path.includes('/auth/register') && method === 'POST') {
      return await register.handler(event);
    }
    
    if (path.includes('/auth/login') && method === 'POST') {
      return await login.handler(event);
    }
    
    if (path.includes('/auth/profile/picture') && method === 'PUT') {
      return await updateProfilePicture.handler(event);
    }

    // If no route matches
    return createErrorResponse(`Route not found: ${method} ${path}`, 404);
    
  } catch (error) {
    console.error('Auth handler error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};
