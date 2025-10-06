//Baljinnyam Puntsagnorov
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
  const resourceArn = resource || '*';
  let wildcardResource = resourceArn;
  if (resourceArn !== '*' && !resourceArn.endsWith('/*')) {
    const parts = resourceArn.split('/');
    const apiParts = parts.slice(0, -2);
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
  if (event.methodArn && event.methodArn.includes('/OPTIONS/')) {
    return generatePolicy('anonymous', 'Allow', event.methodArn);
  }
  const httpMethod = event.httpMethod || event.requestContext?.http?.method || event.requestContext?.httpMethod;
  if (httpMethod === 'OPTIONS') {
    return generatePolicy('anonymous', 'Allow', event.methodArn || '*');
  }
  try {
    const token = event.authorizationToken || event.headers?.Authorization || event.headers?.authorization;
    if (!token) throw new Error('Unauthorized');
    const cleanToken = token.replace(/^Bearer\s+/i, '');
    const decoded = await verifyToken(cleanToken);
    const userId = decoded.userId || decoded.sub || decoded.id;
    const email = decoded.email;
    const apiGatewayArnTmp = event.methodArn.split(':');
    const accountId = apiGatewayArnTmp[4];
    const restApiAndStage = apiGatewayArnTmp[5].split('/');
    const restApiId = restApiAndStage[0];
    const stage = restApiAndStage[1];
    const wildcardArn = `arn:aws:execute-api:${process.env.AWS_REGION || 'us-east-1'}:${accountId}:${restApiId}/${stage}/*`;
    return generatePolicy(userId, 'Allow', wildcardArn, {
      userId,
      email,
      user: JSON.stringify({ id: userId, email })
    });
  } catch (error) {
    return generatePolicy('user', 'Deny', event.methodArn);
  }
};
