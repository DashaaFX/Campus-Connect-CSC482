import { orderModel } from '/opt/nodejs/models/Order.js';
import { ProductModel } from '/opt/nodejs/models/Product.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';
import { ORDER_STATUSES } from '/opt/nodejs/constants/orderStatus.js';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

//Purpose: Creates a Stripe Checkout Session for a digital order after it’s approved.
/*Checks user authentication and order ownership.
Ensures order status is APPROVED and product is digital.
If a recent session exists (within 30 min), reuses it (prevents duplicate payments).
Otherwise, creates a new Stripe Checkout Session (or simulates one if Stripe is not configured).
Updates the order with session info and logs a timeline event.
Returns: Session URL and ID for frontend to redirect the buyer to Stripe’s payment page.*/
let cachedStripeSecret;
async function getStripeSecretKey() {
  // Direct override from env for local/dev convenience
  const direct = process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.trim();
  if (direct) return direct;
  if (cachedStripeSecret) return cachedStripeSecret;
  const secretArn = process.env.STRIPE_SECRET_ARN;
  if (!secretArn) return '';
  try {
    const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
    const command = new GetSecretValueCommand({ SecretId: secretArn });
    const data = await client.send(command);
    const raw = data.SecretString || (data.SecretBinary ? Buffer.from(data.SecretBinary).toString('utf8') : '');
    try {
      const parsed = JSON.parse(raw);
      cachedStripeSecret = parsed.secretKey || parsed.secret || parsed.STRIPE_SECRET_KEY || '';
    } catch {
      cachedStripeSecret = raw;
    }
    return cachedStripeSecret;
  } catch (e) {
    console.error('[stripe-secret-load-error]', e.message);
    return '';
  }
}

// Creates a Stripe Checkout Session for a digital order after approval.
// Falls back to simulated URL if STRIPE_SECRET_KEY not configured.
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: JSON.stringify({})
    };
  }
  try {
    const userId = event.requestContext?.authorizer?.userId;
    if (!userId) return createErrorResponse('User authentication required', 401);
    const orderId = event.pathParameters?.id;
    if (!orderId) return createErrorResponse('Order ID required', 400);

    const order = await orderModel.get(orderId);
    if (!order) return createErrorResponse('Order not found', 404);
    if (order.userId !== userId) return createErrorResponse('Only buyer can initiate checkout', 403);
    if (order.status !== ORDER_STATUSES.APPROVED) return createErrorResponse('Order must be approved before checkout', 409);

    // Determine digital product and seller Stripe account
    // Prefer products array for per-product status
    const firstProductEntry = order.items?.[0] || order.products?.[0] || null;
    const productModel = new ProductModel();
    let product = null;
    if (firstProductEntry) {
      const pid = firstProductEntry.productId || firstProductEntry.product?.id || firstProductEntry.product?._id;
      if (pid) product = await productModel.getById(pid);
    }
    const isDigital = !!product?.isDigital;
    if (!isDigital) return createErrorResponse('Checkout only supported for digital products', 400);
    let sellerStripeAccountId = null;
    let sellerOnboardingStatus = null;
    if (order.sellerId) {
      const { UserModel } = await import('/opt/nodejs/models/User.js');
      const userModel = new UserModel();
      const seller = await userModel.getById(order.sellerId);
      sellerStripeAccountId = seller?.stripeAccountId || null;
      sellerOnboardingStatus = seller?.stripeOnboardingStatus || null;
    }
    if (!sellerStripeAccountId) return createErrorResponse('Seller is not onboarded with Stripe', 409);
    if (sellerOnboardingStatus !== 'complete') return createErrorResponse('Seller onboarding incomplete. Please wait until seller finishes Stripe setup.', 409);

    // Duplicate payment attempt guard: reuse existing session if still initiated AND < 30 min old
    const THIRTY_MIN_MS = 30 * 60 * 1000;
    const stripeKey = await getStripeSecretKey();
    if (order.stripeCheckoutSessionId && order.stripeCheckoutSessionUrl && order.paymentStatus === 'initiated' && stripeKey) {
      try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(stripeKey);
        const existingSession = await stripe.checkout.sessions.retrieve(order.stripeCheckoutSessionId);
        if (existingSession.status === 'open') {
          // Ensure timeline has a payment_initiated marker; add if missing (idempotent enhancement)
          const hasInitiated = (order.timeline || []).some(ev => ev.type === 'payment_initiated');
          if (!hasInitiated) {
            await orderModel.update(orderId, { timeline: [...(order.timeline||[]), { at: new Date().toISOString(), type: 'payment_initiated', actor: userId, actorType: 'user', actorId: userId } ] });
          }
          const createdAt = order.checkoutSessionCreatedAt ? Date.parse(order.checkoutSessionCreatedAt) : null;
          const expiresAt = createdAt ? new Date(createdAt + THIRTY_MIN_MS).toISOString() : undefined;
          // Add payment_reused event if not already present
          const hasReused = (order.timeline || []).some(ev => ev.type === 'payment_reused');
          if (!hasReused) {
            try { await orderModel.update(orderId, { timeline: [...(order.timeline||[]), { at: new Date().toISOString(), type: 'payment_reused', actor: userId, actorType: 'user', actorId: userId }] }); } catch (_) {}
          }
          const resp = createSuccessResponse({ orderId, sessionUrl: order.stripeCheckoutSessionUrl, sessionId: order.stripeCheckoutSessionId, reused: true, expiresAt });
          resp.headers = { ...resp.headers, 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token', 'Access-Control-Allow-Methods': 'POST,OPTIONS' };
          return resp;
        }
      } catch (e) {
        console.log('Existing session invalid or expired:', e.message);
        // Continue to create new session
      }
    }

    const amountCents = Math.round((order.total || 0) * 100);
    if (amountCents <= 0) return createErrorResponse('Invalid order amount', 400);

    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
    let sessionUrl;
    let sessionId;

    if (stripeKey) {
      try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(stripeKey);
        if (!orderId) {
          return createErrorResponse('Order metadata missing', 500);
        }
        const PLATFORM_FEE_RATE = parseFloat(process.env.PLATFORM_FEE_RATE || '0.10'); // 10% commission
        const platformFeeCents = Math.round(amountCents * PLATFORM_FEE_RATE);
        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          line_items: [
            {
              price_data: {
                currency: 'usd',
                unit_amount: amountCents,
                product_data: { name: product.name || product.title || 'Digital Product' }
              },
              quantity: 1
            }
          ],
          payment_intent_data: {
            transfer_data: { destination: sellerStripeAccountId },
            application_fee_amount: platformFeeCents
          },
          metadata: { orderId },
          success_url: `${frontendBase}/orders/${orderId}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${frontendBase}/orders/${orderId}/failed?session_id={CHECKOUT_SESSION_ID}`,
          automatic_tax: { enabled: false }
        }, {
          idempotencyKey: `checkout_${orderId}`
        });
        sessionUrl = session.url;
        sessionId = session.id;
      } catch (e) {
        console.error('Stripe checkout session creation failed:', e.message);
        return createErrorResponse('Failed to initialize checkout session', 500);
      }
    } else {
      sessionId = 'demo_session_' + orderId;
      sessionUrl = `${frontendBase}/orders/${orderId}/success?session_id=${sessionId}&demo=1`;
    }

    const now = new Date().toISOString();
    await orderModel.update(orderId, {
      stripeCheckoutSessionId: sessionId,
      stripeCheckoutSessionUrl: sessionUrl,
      paymentStatus: 'initiated',
      checkoutSessionCreatedAt: now,
      timeline: [ ...(order.timeline || []), { at: now, type: 'payment_initiated', actor: userId, actorType: 'user', actorId: userId } ]
    });

  const expiresAt = new Date(Date.now() + THIRTY_MIN_MS).toISOString();
  const resp = createSuccessResponse({ orderId, sessionUrl, sessionId, reused: false, expiresAt });
    resp.headers = {
      ...resp.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'POST,OPTIONS'
    };
    return resp;
  } catch (error) {
    console.error('Create checkout session error:', error);
    const errResp = createErrorResponse(error.message, 500);
    errResp.headers = {
      ...errResp.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'POST,OPTIONS'
    };
    return errResp;
  }
};
