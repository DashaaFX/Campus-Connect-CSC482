
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';
import { UserModel } from '/opt/nodejs/models/User.js';

export const handler = async (event) => {
  const userId = event.requestContext?.authorizer?.userId;
  if (!userId) return createErrorResponse('Missing userId', 401);

  const method = event.httpMethod;
  const userModel = new UserModel();

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

  // Fetch archived order IDs
  if (method === 'GET') {
    const user = await userModel.get(userId);
    return createSuccessResponse({ archivedOrderIds: user?.archivedOrderIds || [] });
  }

  // Archive or unarchive orders
  if (method === 'POST') {
    const { orderId, action } = JSON.parse(event.body || '{}');
    if (!orderId || !['archive', 'unarchive'].includes(action)) {
      return createErrorResponse('Missing orderId or invalid action', 400);
    }
    const user = await userModel.get(userId);
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

  return createErrorResponse('Method not allowed', 405);
};