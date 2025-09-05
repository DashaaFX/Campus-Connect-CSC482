import { verifyToken } from '../utils/jwt.js';
import { createErrorResponse } from '../utils/response.js';

export const authMiddleware = async (event, context) => {
  try {
    const token = event.headers?.Authorization?.replace('Bearer ', '') || 
                  event.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return {
        principalId: 'user',
        policyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Action: 'execute-api:Invoke',
              Effect: 'Deny',
              Resource: event.methodArn
            }
          ]
        },
        context: {
          error: 'Missing authentication token'
        }
      };
    }

    const decoded = await verifyToken(token);
    
    return {
      principalId: decoded.userId,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: event.methodArn
          }
        ]
      },
      context: {
        userId: decoded.userId,
        email: decoded.email || ''
      }
    };
  } catch (error) {
    console.error('Auth error:', error);
    
    return {
      principalId: 'user',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Deny',
            Resource: event.methodArn
          }
        ]
      },
      context: {
        error: 'Invalid authentication token'
      }
    };
  }
};

export const handler = authMiddleware;
