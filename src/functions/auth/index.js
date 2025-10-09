//Baljinnyam Puntsagnorov
import * as register from './register.js';
import * as login from './login.js';
import * as updateProfilePicture from './updateProfilePicture.js';
import * as getUser from './getUser.js';
import * as linkFirebaseAccount from './linkFirebaseAccount.js';
import { createErrorResponse, createSuccessResponse } from '/opt/nodejs/utils/response.js';

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
    
    if (path.includes('/auth/profile-picture') && method === 'PUT') {
      return await updateProfilePicture.handler(event);
    }
    // Link Firebase account to existing user
    if (path.includes('/auth/firebase/link') && method === 'POST') {
      return await linkFirebaseAccount.handler(event);
    }

    // Get user by id
    if (path.includes('/auth/user/') && method === 'GET') {
      return await getUser.handler(event);
    }

    //verify Firebase ID token  and return uid.
    if (path.includes('/auth/firebase/verify') && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        if (!body.token) return createErrorResponse('Missing token', 400);
        const { verifyFirebaseIdToken } = await import('/opt/nodejs/utils/firebaseAdmin.js');
        const decoded = await verifyFirebaseIdToken(body.token);
        return createSuccessResponse({ uid: decoded.uid, decoded });
      } catch (err) {
        console.error('Firebase verify error:', err);
        return createErrorResponse('Invalid Firebase token', 401);
      }
    }

    // If no route matches
    return createErrorResponse(`Route not found: ${method} ${path}`, 404);
    
  } catch (error) {
    console.error('Auth handler error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};
