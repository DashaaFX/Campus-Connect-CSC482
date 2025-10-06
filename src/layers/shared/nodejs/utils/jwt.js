//Baljinnyam Puntsagnorov
import jwt from 'jsonwebtoken';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

let jwtSecret = null;

const getJWTSecret = async () => {
  if (jwtSecret) return jwtSecret;
  
  if (process.env.ENVIRONMENT === 'local') {
    jwtSecret = process.env.JWT_SECRET || 'local-testing-secret';
    return jwtSecret;
  }
  
  try {
    const client = new SecretsManagerClient({ 
      region: process.env.AWS_REGION || 'us-east-1' 
    });
    const command = new GetSecretValueCommand({
      SecretId: process.env.JWT_SECRET
    });
    
    const result = await client.send(command);
    const secretValue = JSON.parse(result.SecretString);
    jwtSecret = secretValue.secret;
    return jwtSecret;
  } catch (error) {
    throw new Error('Failed to retrieve JWT secret');
  }
};

export const generateToken = async (payload, expiresIn = '1d') => {
  const secret = await getJWTSecret();
  return jwt.sign(payload, secret, { expiresIn });
};

export const verifyToken = async (token) => {
  const secret = await getJWTSecret();
  return jwt.verify(token, secret);
};
