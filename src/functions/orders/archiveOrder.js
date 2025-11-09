
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';
// Import both class and pre-instantiated export to be resilient to layer export patterns
import { UserModel, userModel as sharedUserModel } from '/opt/nodejs/models/User.js';

export const handler = async (event) => {
  const userId = event.requestContext?.authorizer?.userId;
  if (!userId) return createErrorResponse('Missing userId', 401);

  const method = event.httpMethod;
  // Prefer existing instance from layer if available to avoid repeated construction
  const userModel = sharedUserModel instanceof UserModel ? sharedUserModel : new UserModel();

  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
      },
      body: JSON.stringify({})
    };
  }

  try {
    // Fetch archived order IDs
    if (method === 'GET') {
      // UserModel exposes getById (not get); adapt accordingly
      const user = await userModel.getById(userId);
      // Defensive: ensure array
      const archivedOrderIds = Array.isArray(user?.archivedOrderIds) ? user.archivedOrderIds : [];
      return createSuccessResponse({ archivedOrderIds });
    }

    // Archive or unarchive orders
    if (method === 'POST') {
      let parsedBody = {};
      try { parsedBody = JSON.parse(event.body || '{}'); } catch (e) {
        return createErrorResponse('Invalid JSON body', 400);
      }
      const { orderId, action } = parsedBody;
      if (!orderId || !['archive', 'unarchive'].includes(action)) {
        return createErrorResponse('Missing orderId or invalid action', 400);
      }
  const user = await userModel.getById(userId);
      let archivedOrderIds = Array.isArray(user?.archivedOrderIds) ? user.archivedOrderIds : [];
      if (action === 'archive' && !archivedOrderIds.includes(orderId)) {
        archivedOrderIds.push(orderId);
      }
      if (action === 'unarchive') {
        archivedOrderIds = archivedOrderIds.filter(id => id !== orderId);
      }
      await userModel.update(userId, { archivedOrderIds });
      return createSuccessResponse({ archivedOrderIds });
    }
  } catch (err) {
    console.error('archiveOrder handler error:', err);
    // Provide a generic 500; detailed stack is in CloudWatch
    return createErrorResponse('Failed to process archive request', 500);
  }

  return createErrorResponse('Method not allowed', 405);
};