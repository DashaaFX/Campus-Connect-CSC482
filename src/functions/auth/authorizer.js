import { verifyToken } from '/opt/nodejs/utils/jwt.js';

export const handler = async (event) => {
  try {
    console.log('JWT Authorizer event:', JSON.stringify(event, null, 2));
    
    const token = event.authorizationToken?.replace('Bearer ', '') || 
                  event.headers?.Authorization?.replace('Bearer ', '') ||
                  event.headers?.authorization?.replace('Bearer ', '');
    
    if (!token) {
      console.log('No token provided');
      throw new Error('Unauthorized');
    }

    // Verify JWT token
    const decoded = await verifyToken(token);
    
    if (!decoded) {
      console.log('Invalid token');
      throw new Error('Unauthorized');
    }

    console.log('Token verified successfully for user:', decoded.userId);

    // Generate policy
    const policy = generatePolicy(decoded.userId, 'Allow', event.methodArn, decoded);
    
    return policy;

  } catch (error) {
    console.error('JWT Authorization error:', error);
    throw new Error('Unauthorized');
  }
};

const generatePolicy = (principalId, effect, resource, context = {}) => {
  const authResponse = {
    principalId: principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource
        }
      ]
    },
    context: {
      userId: context.userId,
      email: context.email,
      // Add any other context you need in your functions
    }
  };

  console.log('Generated policy:', JSON.stringify(authResponse, null, 2));
  return authResponse;
};
