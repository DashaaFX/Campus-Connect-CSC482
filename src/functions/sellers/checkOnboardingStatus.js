import { UserModel } from '/opt/nodejs/models/User.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'POST,OPTIONS'
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '{}' };
  }
  try {
    const userId = event.requestContext?.authorizer?.userId;
    if (!userId) return { ...createErrorResponse('User authentication required', 401), headers: CORS_HEADERS };
    const userModel = new UserModel();
    const user = await userModel.getById(userId);
    if (!user || !user.stripeAccountId) return { ...createErrorResponse('User or Stripe account not found', 404), headers: CORS_HEADERS };

    // Get Stripe secret key
    const { secretKey } = process.env.STRIPE_SECRET_KEY
      ? { secretKey: process.env.STRIPE_SECRET_KEY }
      : await (async () => {
          const { SecretsManagerClient, GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
          const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
          const command = new GetSecretValueCommand({ SecretId: process.env.STRIPE_SECRET_ARN });
          const data = await client.send(command);
          const raw = data.SecretString || (data.SecretBinary ? Buffer.from(data.SecretBinary).toString('utf8') : '');
          try { return JSON.parse(raw); } catch { return { secretKey: raw }; }
        })();
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(secretKey);

    // Fetch Stripe account details
    const account = await stripe.accounts.retrieve(user.stripeAccountId);
    const detailsSubmitted = account.details_submitted;

    // Update onboarding status if complete
    if (detailsSubmitted && user.stripeOnboardingStatus !== 'complete') {
      await userModel.update(userId, { stripeOnboardingStatus: 'complete' });
    }

    return { ...createSuccessResponse({ stripeOnboardingStatus: detailsSubmitted ? 'complete' : 'incomplete' }), headers: CORS_HEADERS };
  } catch (error) {
    console.error('Stripe onboarding status error:', error);
    return { ...createErrorResponse(error.message, 500), headers: CORS_HEADERS };
  }
};
