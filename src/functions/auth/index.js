import * as register from './register.js';
import * as login from './login.js';
import * as updateProfilePicture from './updateProfilePicture.js';
import * as linkFirebaseAccount from './linkFirebaseAccount.js';
import { createErrorResponse } from '/opt/nodejs/utils/response.js';
import { verifyFirebaseIdToken } from '/opt/nodejs/utils/firebaseAdmin.js';

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

    if (path.includes('/auth/firebase/link') && method === 'POST') {
      return await linkFirebaseAccount.handler(event);
    }

    //verify Firebase ID token (chat integration)
    if (path.includes('/auth/firebase/verify') && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        const decoded = await verifyFirebaseIdToken(body.token);
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: true, uid: decoded.uid, decoded })
        };
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
