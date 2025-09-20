import { UserModel } from '/opt/nodejs/models/User.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'PUT,OPTIONS'
      },
      body: JSON.stringify({})
    };
  }

  try {
    // Get user info from JWT authorizer context
    const userId = event.requestContext?.authorizer?.userId;

    if (!userId) {
      return createErrorResponse('User authentication required', 401);
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { profilePicture } = body;

    if (!profilePicture) {
      return createErrorResponse('profilePicture is required', 400);
    }

    // Validate profile picture URL
    if (typeof profilePicture !== 'string' || 
        (!profilePicture.startsWith('http://') && !profilePicture.startsWith('https://'))) {
      return createErrorResponse('Invalid profile picture URL', 400);
    }

    // Update the user's profile picture
    const userModel = new UserModel();

    const updatedUser = await userModel.updateProfilePicture(userId, profilePicture);

    if (!updatedUser) {
      return createErrorResponse('User not found', 404);
    }

    const response = createSuccessResponse({ 
      message: 'Profile picture updated successfully',
      user: updatedUser
    });

    response.headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'PUT,OPTIONS'
    };

    return response;

  } catch (error) {
    console.error('Update profile picture error:', error);
    const errorResponse = createErrorResponse(error.message, 500);

    errorResponse.headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'PUT,OPTIONS'
    };

    return errorResponse;
  }
};
