import { UserModel } from '/opt/nodejs/models/User.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
  try {
    // This should be protected and only used for initial setup
    const { email } = JSON.parse(event.body);

    if (!email) {
      return createErrorResponse('Email is required', 400);
    }

    const userModel = new UserModel();
    const user = await userModel.getByEmail(email);

    if (!user) {
      return createErrorResponse('User not found', 404);
    }

    // Update user role to Admin
    await userModel.update(user.id, { role: 'Admin' });

    return createSuccessResponse({
      message: `User ${email} is now an admin`,
      userId: user.id
    });

  } catch (error) {
    console.error('Make admin error:', error);
    return createErrorResponse(error.message, 500);
  }
};
