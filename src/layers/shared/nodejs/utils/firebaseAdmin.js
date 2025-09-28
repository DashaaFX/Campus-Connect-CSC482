import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import * as admin from 'firebase-admin';

let firebaseApp; // cached singleton
let initPromise;

const secretsClient = new SecretsManagerClient({});

async function loadServiceAccount() {
  const secretArn = process.env.FIREBASE_SECRET_ARN;
  if (!secretArn) {
    throw new Error('FIREBASE_SECRET_ARN environment variable not set');
  }
  const res = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretArn }));
  const json = res.SecretString;
  if (!json) throw new Error('Firebase secret has no SecretString content');
  return JSON.parse(json);
}

export async function getFirebaseApp() {
  if (firebaseApp) return firebaseApp;
  if (!initPromise) {
    initPromise = (async () => {
      const serviceAccount = await loadServiceAccount();
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      return firebaseApp;
    })();
  }
  return initPromise;
}

export async function verifyFirebaseIdToken(idToken) {
  if (!idToken) throw new Error('Missing Firebase ID token');
  const app = await getFirebaseApp();
  return app.auth().verifyIdToken(idToken);
}
