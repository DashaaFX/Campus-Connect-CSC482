import { UserModel } from '/opt/nodejs/models/User.js';
import { createResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
  try {
    // Get the current user from the JWT authorizer
    const requestingUser = event.requestContext.authorizer.user;
    
    // Verify the requesting user is an admin
    if (!requestingUser || requestingUser.role !== 'Admin') {
      return createErrorResponse('Unauthorized: Only administrators can perform this action', 403);
    }
    
    // Parse the body to get the email of the user to promote
    const body = JSON.parse(event.body || '{}');
    const { email } = body;
    
    if (!email) {
      return createErrorResponse('Missing required parameter: email', 400);
    }
    
    // Find the user to be promoted
    const userToPromote = await UserModel.getByEmail(email);
    
    if (!userToPromote) {
      return createErrorResponse(`User with email ${email} not found`, 404);
    }
    
    // Update the user's role to Admin
    const updatedUser = await UserModel.update({
      id: userToPromote.id,
      role: 'Admin'
    });
    
    return createResponse({
      message: `User ${email} has been promoted to Admin`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role
      }
    }, 200);
    
  } catch (error) {
    console.error('Make admin error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};