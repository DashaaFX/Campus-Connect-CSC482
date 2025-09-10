import jwt from 'jsonwebtoken';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsManager = new SecretsManagerClient({ region: process.env.AWS_REGION });

let jwtSecret = null;

const getJWTSecret = async () => {
  if (jwtSecret) return jwtSecret;
  
  try {
    const command = new GetSecretValueCommand({
      SecretId: process.env.JWT_SECRET
    });
    const result = await secretsManager.send(command);
    const secret = JSON.parse(result.SecretString);
    jwtSecret = secret.secret;
    return jwtSecret;
  } catch (error) {
    console.error('Error getting JWT secret:', error);
    throw error;
  }
};

const generatePolicy = (principalId, effect, resource, context = {}) => {
  // For debugging: Always allow access to all resources
  const resourceArn = resource || '*';
  
  // Create a wildcard resource based on the provided ARN
  // This allows access to all methods on the same API
  let wildcardResource = resourceArn;
  
  // If it's a specific method, create a wildcard for all methods
  if (resourceArn !== '*' && !resourceArn.endsWith('/*')) {
    // Extract the API parts before the method
    const parts = resourceArn.split('/');
    const apiParts = parts.slice(0, -2); // Remove method and resource path
    wildcardResource = [...apiParts, '*'].join('/');
  }
  
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          // Use wildcard resource to allow access to all API paths
          Resource: wildcardResource,
        },
      ],
    },
    context,
  };
};

const verifyToken = async (token) => {
  try {
    const secret = await getJWTSecret();
    const decoded = jwt.verify(token, secret);
    return decoded;
  } catch (error) {
    throw error;
  }
};

export const handler = async (event) => {
  // For AuthorizerPayloadFormatVersion 1.0, check the methodArn for OPTIONS
  if (event.methodArn && event.methodArn.includes('/OPTIONS/')) {
    return generatePolicy('anonymous', 'Allow', event.methodArn);
  }

  // Also check httpMethod in case it's available
  const httpMethod = event.httpMethod || event.requestContext?.http?.method || event.requestContext?.httpMethod;
  
  if (httpMethod === 'OPTIONS') {
    return generatePolicy('anonymous', 'Allow', event.methodArn || '*');
  }

  try {
    // Get token from Authorization header
    const token = event.authorizationToken || 
                  event.headers?.Authorization || 
                  event.headers?.authorization;
    
    if (!token) {
      throw new Error('Unauthorized');
    }

    // Remove 'Bearer ' prefix if present
    const cleanToken = token.replace(/^Bearer\s+/i, '');
    
    const decoded = await verifyToken(cleanToken);
    
    // Extract userId and email from the decoded token
    const userId = decoded.userId || decoded.sub || decoded.id;
    const email = decoded.email;
    
    // Authentication successful
    
    // For debugging - use a broad policy that allows access to all API paths
    const apiGatewayArnTmp = event.methodArn.split(':');
    const apiGatewayArnAwsAccountId = apiGatewayArnTmp[4];
    const apiGatewayArnRestApiId = apiGatewayArnTmp[5].split('/')[0];
    const apiGatewayArnStage = apiGatewayArnTmp[5].split('/')[1];
    
    // Generate a wildcard resource ARN that grants access to all paths in this API
    const wildcardArn = `arn:aws:execute-api:${process.env.AWS_REGION || 'us-east-1'}:${apiGatewayArnAwsAccountId}:${apiGatewayArnRestApiId}/${apiGatewayArnStage}/*`;
    
    // Include userId in context AND in principalId
    return generatePolicy(userId, 'Allow', wildcardArn, { 
      userId, 
      email,
      // Include additional user info if available
      user: JSON.stringify({
        id: userId,
        email: email
      })
    });
    
  } catch (error) {
    // Return explicit deny policy instead of throwing error
    return generatePolicy('user', 'Deny', event.methodArn);
  }
};
