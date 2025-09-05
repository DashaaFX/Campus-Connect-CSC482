import { userModel } from '/opt/nodejs/models/User.js';
import { createSuccessResponse, createErrorResponse, parseJSONBody, validateRequiredFields } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
  try {
    const body = parseJSONBody(event.body);
    
    const requiredFields = ['email', 'password', 'firstName', 'lastName'];
    const validation = validateRequiredFields(body, requiredFields);
    if (!validation.isValid) {
      return createErrorResponse(validation.message, 400);
    }

    const { email, password, firstName, lastName, profilePicture } = body;

    // Check if user already exists
    const existingUser = await userModel.getByEmail(email);
    if (existingUser) {
      return createErrorResponse('User with this email already exists', 400);
    }

    // Create new user
    const newUser = await userModel.create({
      email,
      password,
      firstName,
      lastName,
      profilePicture: profilePicture || null
    });

    // Remove password from response
    const { password: _, ...userResponse } = newUser;

    return createSuccessResponse({
      message: 'User registered successfully',
      user: userResponse
    }, 201);

  } catch (error) {
    console.error('Register error:', error);
    return createErrorResponse(error.message, 500);
  }
};
