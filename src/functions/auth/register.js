//Baljinnyam Puntsagnorov
import { UserModel } from '/opt/nodejs/models/User.js';
import { createSuccessResponse, createErrorResponse, parseJSONBody, validateRequiredFields } from '/opt/nodejs/utils/response.js';
import { generateToken } from '/opt/nodejs/utils/jwt.js';

export const handler = async (event) => {
  try {
    const body = parseJSONBody(event.body);
    
    const requiredFields = ['email', 'password', 'fullname', 'phoneNumber', 'idnum'];
    const validation = validateRequiredFields(body, requiredFields);
    if (!validation.isValid) {
      return createErrorResponse(validation.message, 400);
    }

    const { email, password, fullname, phoneNumber, idnum, profilePicture } = body;

    // Validate profile picture URL if provided
    if (profilePicture && !profilePicture.startsWith('https://')) {
      return createErrorResponse('Profile picture must be a valid HTTPS URL', 400);
    }

    // Check if user already exists
    const userModel = new UserModel();
    const existingUser = await userModel.getByEmail(email);
    if (existingUser) {
      return createErrorResponse('User with this email already exists', 400);
    }

    // Split fullname for compatibility
    const [firstName, ...lastNameParts] = fullname.trim().split(' ');
    const lastName = lastNameParts.join(' ') || '';

    // Create new user
    const newUser = await userModel.create({
      email,
      password,
      firstName,
      lastName,
      fullname,
      phoneNumber,
      idnum,
      profilePicture: profilePicture || null
    });

    // Remove password from response
    const { password: _, ...userResponse } = newUser;

    // Generate JWT token for immediate authentication after registration
    const token = await generateToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role || 'User'
    });

    return createSuccessResponse({
      message: 'User registered successfully',
      user: userResponse,
      token
    }, 201);

  } catch (error) {
    console.error('Register error:', error);
    return createErrorResponse(error.message, 500);
  }
};
