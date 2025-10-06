// Utility functions for initializing Firebase Admin SDK and verifying ID tokens

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let initPromise;
const secretsClient = new SecretsManagerClient({});

async function loadServiceAccount() {
  const secretArn = process.env.FIREBASE_SECRET_ARN;
  if (!secretArn) {
    throw new Error('FIREBASE_SECRET_ARN environment variable not set');
  }
  let json;
  try {
    const res = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretArn }));
    json = res.SecretString;
  } catch (e) {
    if (e.name === 'ResourceNotFoundException') {
      throw new Error(`Firebase service account secret not found: ${secretArn}`);
    }
    throw e;
  }
  if (!json) throw new Error('Firebase service account secret has empty SecretString');
  const obj = JSON.parse(json);
  // Normalize private_key newlines if they are still escaped
  if (obj.private_key && obj.private_key.includes('\\n')) {
    obj.private_key = obj.private_key.replace(/\\n/g, '\n');
  }
  return obj;
}

export async function getFirebaseApp() {
  if (getApps().length) {
    return getApp();
  }
  if (!initPromise) {
    initPromise = (async () => {
      const serviceAccount = await loadServiceAccount();
      if (!serviceAccount.client_email || !serviceAccount.private_key) {
        throw new Error('Firebase service account missing client_email or private_key');
      }
      initializeApp({
        credential: cert(serviceAccount)
      });
      return getApp();
    })();
  }
  return initPromise;
}

export async function verifyFirebaseIdToken(idToken) {
  if (!idToken) throw new Error('Missing Firebase ID token');
  const app = await getFirebaseApp();
  return getAuth(app).verifyIdToken(idToken);
}
