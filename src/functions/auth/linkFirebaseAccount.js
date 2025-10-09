import { UserModel } from '/opt/nodejs/models/User.js';
import { createSuccessResponse, createErrorResponse, parseJSONBody, validateRequiredFields } from '/opt/nodejs/utils/response.js';
// POST /auth/firebase/link 
// links Firebase account to existing user

export const handler = async (event) => {
  try {
    const userId = event.requestContext?.authorizer?.userId;
    if (!userId) return createErrorResponse('User authentication required', 401);

    const body = parseJSONBody(event.body);
    const validation = validateRequiredFields(body, ['token']);
    if (!validation.isValid) return createErrorResponse(validation.message, 400);

    let decoded;
    try {
      const { verifyFirebaseIdToken } = await import('/opt/nodejs/utils/firebaseAdmin.js');
      decoded = await verifyFirebaseIdToken(body.token);
    } catch (err) {
      console.error('Firebase token verify failed:', err);
      return createErrorResponse('Invalid Firebase token', 401);
    }

    const firebaseUid = decoded.uid;

    const userModel = new UserModel();
    const existing = await userModel.getById(userId);
    if (!existing) return createErrorResponse('User not found', 404);

    if (existing.firebaseUid && existing.firebaseUid !== firebaseUid) {
      return createErrorResponse('Account already linked to a different Firebase user', 409);
    }

    if (existing.firebaseUid === firebaseUid) {
      return createSuccessResponse({ message: 'Already linked', firebaseUid });
    }

    // Perform update
    const { UpdateCommand } = await import('@aws-sdk/lib-dynamodb');
    const { docClient } = await import('/opt/nodejs/utils/dynamodb.js');
    const updatedAt = new Date().toISOString();

    const command = new UpdateCommand({
      TableName: process.env.USERS_TABLE,
      Key: { id: userId },
      UpdateExpression: 'SET #firebaseUid = :firebaseUid, #updatedAt = :updatedAt',
      ExpressionAttributeNames: { '#firebaseUid': 'firebaseUid', '#updatedAt': 'updatedAt' },
      ExpressionAttributeValues: { ':firebaseUid': firebaseUid, ':updatedAt': updatedAt },
      ReturnValues: 'ALL_NEW'
    });

    const result = await docClient.send(command);
    const { password: _, ...userWithoutPassword } = result.Attributes;

    return createSuccessResponse({ message: 'Firebase account linked', user: userWithoutPassword, firebaseUid });
  } catch (error) {
    console.error('Link Firebase account error:', error);
    return createErrorResponse(error.message, 500);
  }
};
