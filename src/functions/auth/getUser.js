import { UserModel } from '/opt/nodejs/models/User.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';

// GET /auth/user/{id} -> returns  user with (id, email, role, profilePicture, firebaseUid, profile)
export const handler = async (event) => {
  try {
    const requesterId = event.requestContext?.authorizer?.userId;
    if (!requesterId) return createErrorResponse('User authentication required', 401);

    const path = event.path || '';
    const segments = path.split('/').filter(Boolean);
    const userId = segments.pop();
    if (!userId) return createErrorResponse('User id required', 400);

    const model = new UserModel();
    const user = await model.getById(userId);
    if (!user) return createErrorResponse('User not found', 404);

    const { password: _pw, ...safe } = user;
    return createSuccessResponse({ user: safe });
  } catch (error) {
    console.error('Get user error:', error);
    return createErrorResponse('Failed to get user', 500);
  }
};
