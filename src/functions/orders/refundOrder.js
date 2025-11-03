import { orderModel } from '/opt/nodejs/models/Order.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';
import { ORDER_STATUSES } from '/opt/nodejs/constants/orderStatus.js';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

let cachedStripeSecret;
const STRIPE_SECRET_CACHE_TTL_MS = 15 * 60 * 1000;
async function getStripeSecretKey(forceRefresh = false) {
  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.trim() !== '') {
    return process.env.STRIPE_SECRET_KEY.trim();
  }
  if (cachedStripeSecret && !forceRefresh) {
    if (Date.now() - cachedStripeSecret.loadedAt < STRIPE_SECRET_CACHE_TTL_MS) return cachedStripeSecret.value;
  }
  const secretArn = process.env.STRIPE_SECRET_ARN;
  if (!secretArn) return '';
  try {
    const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
    const command = new GetSecretValueCommand({ SecretId: secretArn });
    const data = await client.send(command);
    let raw = data.SecretString || (data.SecretBinary ? Buffer.from(data.SecretBinary).toString('utf8') : '');
    let value;
    try { const parsed = JSON.parse(raw); value = parsed.secretKey || parsed.secret || parsed.STRIPE_SECRET_KEY || ''; }
    catch { value = raw; }
    cachedStripeSecret = { value, loadedAt: Date.now() };
    return value;
  } catch (e) {
    console.error('Refund load Stripe secret failed:', e.message); return '';
  }
}

// Initiates a Stripe refund for a completed digital order.
// Only seller (or admin role if role provided) can trigger.
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*','Access-Control-Allow-Headers': 'Content-Type,Authorization','Access-Control-Allow-Methods': 'POST,OPTIONS' }, body: '{}' };
  }
  try {
    const userId = event.requestContext?.authorizer?.userId;
    const role = event.requestContext?.authorizer?.role;
    if (!userId) return createErrorResponse('User authentication required', 401);
    const orderId = event.pathParameters?.id;
    if (!orderId) return createErrorResponse('Order ID required', 400);
    const order = await orderModel.get(orderId);
    if (!order) return createErrorResponse('Order not found', 404);
    if (order.status !== ORDER_STATUSES.COMPLETED) return createErrorResponse('Order not in refundable state', 409);
    // Seller or admin
    const isSeller = order.sellerId === userId || (order.items||[]).some(it => it.sellerId === userId || it.product?.sellerId === userId);
    const isAdmin = role === 'admin';
    if (!isSeller && !isAdmin) return createErrorResponse('Not authorized to refund this order', 403);
    if (!order.stripePaymentIntentId) return createErrorResponse('No payment intent recorded for this order', 409);

    // Full refund only; request body ignored

    const stripeKey = await getStripeSecretKey();
    if (!stripeKey) return createErrorResponse('Stripe not configured for refunds', 500);
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey);

    // Idempotency guard: check if a succeeded refund already exists
    try {
      const existingRefunds = await stripe.refunds.list({ payment_intent: order.stripePaymentIntentId, limit: 1 });
      if (existingRefunds.data.some(r => r.status === 'succeeded')) {
        return createErrorResponse('Refund already processed', 409);
      }
    } catch (e) {
      console.error('Refund list failed (continuing):', e.message);
    }

    // Full refund only
    let refundParams = { payment_intent: order.stripePaymentIntentId, metadata: { orderId } };
    let refund;
    try {
      refund = await stripe.refunds.create(refundParams);
    } catch (e) {
      console.error('Stripe refund failed:', e.message);
      return createErrorResponse('Refund processing failed', 500);
    }

    // Webhook will finalize status/paymentStatus changes; we append timeline marker proactively
    const now = new Date().toISOString();
      // Update all products to REFUNDED
      const updatedProducts = (order.products || []).map(p => ({ ...p, status: ORDER_STATUSES.REFUNDED }));
      await orderModel.update(orderId, {
        products: updatedProducts,
        timeline: [ ...(order.timeline || []), { at: now, type: 'refund_full_initiated', actor: userId, actorType: 'user', actorId: userId, meta: { refundId: refund.id } } ]
      });
  await orderModel.update(orderId, { updatedAt: now, timeline });

  return createSuccessResponse({ message: 'Refund initiated', orderId, refundId: refund.id });
  } catch (error) {
    console.error('Refund order error:', error);
    return createErrorResponse(error.message, 500);
  }
};