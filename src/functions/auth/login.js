import { userModel } from '/opt/nodejs/models/User.js';
import { createSuccessResponse, createErrorResponse, parseJSONBody, validateRequiredFields } from '/opt/nodejs/utils/response.js';
import { generateToken } from '/opt/nodejs/utils/jwt.js';

export const handler = async (event) => {
  try {
    const body = parseJSONBody(event.body);
    
    const requiredFields = ['email', 'password'];
    const validation = validateRequiredFields(body, requiredFields);
    if (!validation.isValid) {
      return createErrorResponse(validation.message, 400);
    }

    const { email, password } = body;

    // Get user by email
    const user = await userModel.getByEmail(email);
    if (!user) {
      return createErrorResponse('Invalid email or password', 401);
    }

    // Verify password
    const isValidPassword = await userModel.verifyPassword(user, password);
    if (!isValidPassword) {
      return createErrorResponse('Invalid email or password', 401);
    }

    // Generate JWT token
    const token = await generateToken({ 
      userId: user.id, 
      email: user.email 
    });

    // Remove password from response
    const { password: _, ...userResponse } = user;

    return createSuccessResponse({
      message: 'Login successful',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    return createErrorResponse(error.message, 500);
  }
};
