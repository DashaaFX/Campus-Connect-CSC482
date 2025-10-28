import { UserModel } from '/opt/nodejs/models/User.js';
import { createSuccessResponse, createErrorResponse, parseJSONBody } from '/opt/nodejs/utils/response.js';

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
  if (!user) return { ...createErrorResponse('User not found', 404), headers: CORS_HEADERS };

    // If already onboarded, return status
    if (user.stripeAccountId && user.stripeOnboardingStatus === 'complete') {
  return { ...createSuccessResponse({ message: 'Already onboarded', stripeAccountId: user.stripeAccountId }), headers: CORS_HEADERS };
    }

    // Create Stripe Express account if missing
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

    let stripeAccountId = user.stripeAccountId;
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        capabilities: { transfers: { requested: true } },
        email: user.email,
        metadata: { userId }
      });
      stripeAccountId = account.id;
      await userModel.update(userId, { stripeAccountId, stripeOnboardingStatus: 'incomplete' });
    }

    // Create onboarding link
  const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
  const refreshUrl = `${frontendBase}/profile/onboarding-return`;
  const returnUrl = `${frontendBase}/profile/onboarding-return`;
    const link = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding'
    });

    await userModel.update(userId, { stripeOnboardingStatus: 'incomplete' });

    // Timeline event (optional, if you want to append)
    // ...existing code...

    return { ...createSuccessResponse({ onboardingUrl: link.url, stripeAccountId }), headers: CORS_HEADERS };
  } catch (error) {
    console.error('Stripe onboarding link error:', error);
    return { ...createErrorResponse(error.message, 500), headers: CORS_HEADERS };
  }
}
