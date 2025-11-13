import { orderModel } from '/opt/nodejs/models/Order.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';
import { ORDER_STATUSES } from '/opt/nodejs/constants/orderStatus.js';
import { notifyOrderStatusChange } from '/opt/nodejs/services/notifications.js';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

let cachedStripeSecrets = null;
const STRIPE_SECRET_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

async function loadStripeSecrets(forceRefresh = false) {
  if (cachedStripeSecrets && !forceRefresh) {
    const age = Date.now() - cachedStripeSecrets.loadedAt;
    if (age < STRIPE_SECRET_CACHE_TTL_MS) return cachedStripeSecrets;
  }
  
  const result = {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    platformWebhookSecret: process.env.STRIPE_PLATFORM_WEBHOOK_SECRET
  };
  
  if (result.secretKey && result.webhookSecret && result.platformWebhookSecret) {
    cachedStripeSecrets = { ...result, loadedAt: Date.now() };
    return cachedStripeSecrets;
  }
  
  const secretArn = process.env.STRIPE_SECRET_ARN;
  const webhookArn = process.env.STRIPE_WEBHOOK_SECRET_ARN;
  const platformWebhookArn = process.env.STRIPE_PLATFORM_WEBHOOK_SECRET_ARN;
  const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
  
  async function fetch(arn) {
    if (!arn) return {};
    try {
      const command = new GetSecretValueCommand({ SecretId: arn });
      const data = await client.send(command);
      let raw = data.SecretString || (data.SecretBinary ? Buffer.from(data.SecretBinary).toString('utf8') : '');
      try { 
        return JSON.parse(raw); 
      } catch { 
        return { secret: raw }; 
      }
    } catch (e) { 
      console.error('Secrets Manager fetch failed:', e.message); 
      return {}; 
    }
  }
  
  const [s1, s2, s3] = await Promise.all([
    fetch(secretArn),
    fetch(webhookArn),
    fetch(platformWebhookArn)
  ]);
  
  result.secretKey = result.secretKey || s1.secretKey || s1.secret || s1.STRIPE_SECRET_KEY;
  result.webhookSecret = result.webhookSecret || s2.webhookSecret || s2.secret || s2.STRIPE_WEBHOOK_SECRET;
  result.platformWebhookSecret = result.platformWebhookSecret || s3.platformWebhookSecret || s3.secret || s3.STRIPE_PLATFORM_WEBHOOK_SECRET;
  
  cachedStripeSecrets = { ...result, loadedAt: Date.now() };
  return cachedStripeSecrets;
}

// Stripe webhook handler with signature verification
export const handler = async (event) => {
  try {
    const { secretKey: stripeKey, webhookSecret, platformWebhookSecret } = await loadStripeSecrets();
    if (!stripeKey || (!webhookSecret && !platformWebhookSecret)) {
      return createErrorResponse('Stripe webhook not configured', 500);
    }

    // Retrieve raw body (before JSON parse) for signature verification
    let rawBody;
    if (event.isBase64Encoded) {
      rawBody = Buffer.from(event.body || '', 'base64').toString('utf8');
    } else {
      rawBody = event.body || '';
    }
    if (!rawBody) return createErrorResponse('Empty webhook body', 400);

    // Header keys can come in different casings; normalize
    const headers = Object.fromEntries(
      Object.entries(event.headers || {}).map(([k, v]) => [k.toLowerCase(), v])
    );
    const signature = headers['stripe-signature'];
    if (!signature) return createErrorResponse('Missing Stripe-Signature header', 400);

    // Verify signature & construct event
    let stripeEvent;
    try {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(stripeKey);
      // Try platform webhook secret first (for payment events)
      try {
        stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, platformWebhookSecret);
      } catch (platformErr) {
        // If platform secret fails, try connected account secret
        stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      }
    } catch (err) {
      return createErrorResponse('Invalid signature', 400);
    }

    const eventType = stripeEvent.type;

    // 1. Successful checkout completion -> COMPLETE order
    if (eventType === 'checkout.session.completed') {
      const session = stripeEvent.data?.object;
      const orderId = session?.metadata?.orderId;
      if (!orderId) return createErrorResponse('Missing orderId metadata', 400);
      
      const order = await orderModel.get(orderId);
      if (!order) return createErrorResponse('Order not found', 404);

      // Defensive: verify payment status
      if (session.payment_status !== 'paid') {
        console.error('Checkout session not paid:', { orderId, payment_status: session.payment_status });
        return createErrorResponse('Payment not completed', 409);
      }

      // Idempotent exit if already completed
      if (order.status === ORDER_STATUSES.COMPLETED) {
        return createSuccessResponse({ message: 'Already completed' }, 200);
      }
      if (order.status !== ORDER_STATUSES.APPROVED) {
        return createErrorResponse('Unexpected order status for completion', 409);
      }

      const now = new Date().toISOString();
      const amountTotal = session.amount_total; // cents
      const expectedCents = Math.round((order.total || 0) * 100);
      const suspicious = typeof amountTotal === 'number' && amountTotal !== expectedCents;
      if (suspicious) {
        console.error('Amount mismatch on payment_succeeded', { orderId, expectedCents, amountTotal });
      }

      // Timeline: payment succeeded
      let timeline = [
        ...(order.timeline || []),
        {
          at: now,
          type: 'payment_succeeded',
          actor: 'system',
          actorType: 'system',
          actorId: 'system',
          meta: { amountTotal, expectedCents, suspicious }
        }
      ];

      // Generate download links for digital products
      const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      const ProductModel = (await import('/opt/nodejs/models/Product.js')).ProductModel;
      const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
      const BUCKET_NAME = process.env.UPLOADS_BUCKET || 'campus-connect-uploads';
      let downloadLinks = [];
      
      if (Array.isArray(order.items)) {
        for (const item of order.items) {
          const productId = item.productId || item.id || item.product?.id || item.product?._id || item.product?.productId;
          if (!productId) continue;
          try {
            const productModel = new ProductModel();
            const product = await productModel.getById(productId);
            if (product && product.isDigital && product.documentKey && product.documentKey.startsWith('private/')) {
              const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: product.documentKey });
              const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour expiry
              downloadLinks.push({ productId, url });
            }
          } catch (e) {
            console.error('Error generating download link for product', productId, e);
          }
        }
      }
      
      // Clean workaround: update order in three steps to avoid overlapping document paths
      await orderModel.update(orderId, {
        status: ORDER_STATUSES.COMPLETED,
        paymentStatus: 'succeeded',
        stripePaymentIntentId: session.payment_intent,
        downloadLinks
      });
      await orderModel.update(orderId, {
        timeline: timeline
      });
      await orderModel.update(orderId, {
        completedAt: now
      });
      // Notifications (system) for completion
      try { await notifyOrderStatusChange({ ...order, status: ORDER_STATUSES.COMPLETED, userId: order.userId, sellerId: order.sellerId, id: orderId }, { actorId: 'system', fromStatus: order.status, toStatus: ORDER_STATUSES.COMPLETED }); } catch (e) { console.warn('[notify] completion failed', e.message); }
      
      return createSuccessResponse({ message: 'Order completed', orderId, downloadLinks }, 200);
    }

    // 2. Payment intent failed -> mark paymentStatus failed (do NOT change status so buyer can retry)
    if (eventType === 'payment_intent.payment_failed') {
      const paymentIntent = stripeEvent.data?.object;
      const orderId = paymentIntent?.metadata?.orderId;
      if (!orderId) {
        return createSuccessResponse({ message: 'No orderId metadata; ignoring payment_failed' }, 200);
      }
      
      const order = await orderModel.get(orderId);
      if (!order) {
        return createSuccessResponse({ message: 'Order not found for failed payment (already removed?)' }, 200);
      }
      
      // Ignore if already completed or refunded
      if ([ORDER_STATUSES.COMPLETED, ORDER_STATUSES.REFUNDED].includes(order.status)) {
        return createSuccessResponse({ message: 'Order already settled; ignoring payment_failed' }, 200);
      }
      
      const now = new Date().toISOString();
      const timeline = [
        ...(order.timeline || []),
        {
          at: now,
          type: 'payment_failed',
          actor: 'system',
          actorType: 'system',
          actorId: 'system',
          meta: { paymentIntentId: paymentIntent.id }
        }
      ];
      
      await orderModel.update(orderId, { paymentStatus: 'failed', timeline });
      return createSuccessResponse({ message: 'Payment failure recorded', orderId }, 200);
    }

    // 3. Charge refunded -> only full refunds supported; partial refunds ignored/logged
    if (eventType === 'charge.refunded') {
      const charge = stripeEvent.data?.object;
      const paymentIntentId = charge?.payment_intent;
      
      // Attempt to locate order by payment intent id
      let order = null;
      let orderId = null;
      
      if (paymentIntentId) {
        try {
          const found = await orderModel.listByPaymentIntent(paymentIntentId);
          if (found && found.length === 1) {
            order = found[0];
            orderId = order.id || order._id;
          } else if (found && found.length > 1) {
            console.warn('Multiple orders found for paymentIntentId; using first', { 
              paymentIntentId, 
              count: found.length 
            });
            order = found[0];
            orderId = order.id || order._id;
          }
        } catch (e) {
          console.warn('listByPaymentIntent lookup error', e.message);
        }
      }
      
      let metadataOrderId = charge?.metadata?.orderId || charge?.refunds?.data?.[0]?.metadata?.orderId;
      if (!metadataOrderId && paymentIntentId) {
        if (!orderId) {
          console.warn('Refund event missing orderId metadata; paymentIntentId present but no reliable lookup implemented.', { paymentIntentId });
        }
      }
      
      if (!metadataOrderId) {
        if (!orderId) {
          return createSuccessResponse({ message: 'No orderId metadata on refund; ignoring' }, 200);
        }
      }
      
      if (!orderId) {
        orderId = metadataOrderId;
      }
      if (!order) {
        order = await orderModel.get(orderId);
      }
      if (!order) {
        return createSuccessResponse({ message: 'Order not found for refund event' }, 200);
      }

      // Idempotency: if already refunded, exit
      if (order.status === ORDER_STATUSES.REFUNDED) {
        return createSuccessResponse({ message: 'Already refunded' }, 200);
      }

      const amount = charge.amount; // in cents
      const refunded = charge.amount_refunded; // in cents
      const isFull = refunded >= amount;
      const now = new Date().toISOString();
      let timeline = order.timeline || [];
      
      if (!isFull) {
        console.warn('Partial refund detected but feature disabled. Ignoring.', { 
          orderId, 
          refunded, 
          amount 
        });
        return createSuccessResponse({ message: 'Partial refund ignored (unsupported)' }, 200);
      }
      
      // Full refund path
      timeline = [
        ...timeline,
        {
          at: now,
          type: 'refund_full',
          actor: 'system',
          actorType: 'system',
          actorId: 'system',
          meta: { chargeId: charge.id }
        }
      ];
      
      await orderModel.update(orderId, {
        status: ORDER_STATUSES.REFUNDED,
        paymentStatus: 'refunded',
        refundedAt: now,
        refundAmount: (refunded / 100),
        timeline
      });
      // Notifications  for refund
      try { await notifyOrderStatusChange({ ...order, status: ORDER_STATUSES.REFUNDED, userId: order.userId, sellerId: order.sellerId, id: orderId }, { actorId: 'system', fromStatus: order.status, toStatus: ORDER_STATUSES.REFUNDED }); } catch (e) { console.warn('[notify] refund failed', e.message); }
      
      return createSuccessResponse({ message: 'Order refunded (full)', orderId }, 200);
    }

    // 4. Stripe account updated -> update seller onboarding status
    if (eventType === 'account.updated') {
      const account = stripeEvent.data?.object;
      const sellerStripeAccountId = account?.id;

      if (!sellerStripeAccountId) {
        return createSuccessResponse({ message: 'No account id in account.updated; ignoring' }, 200);
      }

      // Determine completion/restriction/incomplete statuses
      const detailsSubmitted = account.details_submitted === true;
      const chargesEnabled = account.charges_enabled === true;
      const payoutsEnabled = account.payouts_enabled === true;
      const transfersActive = account.capabilities && account.capabilities.transfers && 
        (account.capabilities.transfers === 'active' || account.capabilities.transfers.status === 'active');
      const disabledReason = account.requirements && account.requirements.disabled_reason;

      let newStatus = 'incomplete';
      if (disabledReason) {
        newStatus = 'restricted';
      } else if (detailsSubmitted && (chargesEnabled || payoutsEnabled || transfersActive)) {
        newStatus = 'complete';
      } else if (detailsSubmitted) {
        newStatus = 'incomplete';
      } else {
        newStatus = 'incomplete';
      }

      // Find user(s)
      const { UserModel } = await import('/opt/nodejs/models/User.js');
      const userModel = new UserModel();
      const users = await userModel.listByStripeAccountId(sellerStripeAccountId);

      if (users && users.length > 0) {
        for (const user of users) {
          try {
            const attrs = {
              stripeOnboardingStatus: newStatus,
              updatedAt: new Date().toISOString()
            };
            if (newStatus === 'complete') {
              attrs.stripeOnboardingCompletedAt = new Date().toISOString();
            }
            await userModel.update(user.id, attrs);
          } catch (e) {
            console.error('Failed updating user onboarding status for', user.id, e.message);
          }
        }
        return createSuccessResponse({ 
          message: 'Seller onboarding status updated', 
          sellerStripeAccountId, 
          newStatus 
        }, 200);
      } else {
        return createSuccessResponse({ 
          message: 'No user found for Stripe account', 
          sellerStripeAccountId 
        }, 200);
      }
    }

    // 5. Stripe dispute events
    if (eventType === 'charge.dispute.created') {
      const dispute = stripeEvent.data?.object;
      const chargeId = dispute?.charge;
      const paymentIntentId = dispute?.payment_intent;
      
      // Attempt to find order
      let order = null;
      let orderId = null;
      
      if (paymentIntentId) {
        try {
          const found = await orderModel.listByPaymentIntent(paymentIntentId);
          if (found && found.length > 0) {
            order = found[0];
            orderId = order.id || order._id;
          }
        } catch (e) {
          console.warn('Error finding order by payment intent for dispute', e.message);
        }
      }
      
      if (!orderId) {
        console.warn('Dispute created but no order found', { chargeId, paymentIntentId });
        return createSuccessResponse({ message: 'Dispute created but order not found' }, 200);
      }
      
      const now = new Date().toISOString();
      const timeline = [
        ...(order.timeline || []),
        {
          at: now,
          type: 'dispute_created',
          actor: 'system',
          actorType: 'system',
          actorId: 'system',
          meta: {
            disputeId: dispute.id,
            reason: dispute.reason,
            status: dispute.status,
            amount: dispute.amount
          }
        }
      ];
      
      await orderModel.update(orderId, {
        disputeStatus: 'under_review',
        disputeId: dispute.id,
        timeline
      });
      
      return createSuccessResponse({ message: 'Dispute recorded', orderId, disputeId: dispute.id }, 200);
    }

    if (eventType === 'charge.dispute.closed') {
      const dispute = stripeEvent.data?.object;
      const paymentIntentId = dispute?.payment_intent;
      
      let order = null;
      let orderId = null;
      
      if (paymentIntentId) {
        try {
          const found = await orderModel.listByPaymentIntent(paymentIntentId);
          if (found && found.length > 0) {
            order = found[0];
            orderId = order.id || order._id;
          }
        } catch (e) {
          console.warn('Error finding order for dispute closed', e.message);
        }
      }
      
      if (!orderId) {
        console.warn('Dispute closed but no order found', { paymentIntentId });
        return createSuccessResponse({ message: 'Dispute closed but order not found' }, 200);
      }
      
      const now = new Date().toISOString();
      const timeline = [
        ...(order.timeline || []),
        {
          at: now,
          type: 'dispute_closed',
          actor: 'system',
          actorType: 'system',
          actorId: 'system',
          meta: {
            disputeId: dispute.id,
            status: dispute.status
          }
        }
      ];
      
      await orderModel.update(orderId, {
        disputeStatus: dispute.status, // 'won', 'lost', etc.
        timeline
      });
      
      return createSuccessResponse({ message: 'Dispute closed', orderId, status: dispute.status }, 200);
    }

    if (eventType === 'charge.dispute.funds_reinstated') {
      const dispute = stripeEvent.data?.object;
      const paymentIntentId = dispute?.payment_intent;
      
      let order = null;
      let orderId = null;
      
      if (paymentIntentId) {
        try {
          const found = await orderModel.listByPaymentIntent(paymentIntentId);
          if (found && found.length > 0) {
            order = found[0];
            orderId = order.id || order._id;
          }
        } catch (e) {
          console.warn('Error finding order for dispute funds reinstated', e.message);
        }
      }
      
      if (!orderId) {
        console.warn('Dispute funds reinstated but no order found', { paymentIntentId });
        return createSuccessResponse({ message: 'Dispute funds reinstated but order not found' }, 200);
      }
      
      const now = new Date().toISOString();
      const timeline = [
        ...(order.timeline || []),
        {
          at: now,
          type: 'dispute_funds_reinstated',
          actor: 'system',
          actorType: 'system',
          actorId: 'system',
          meta: {
            disputeId: dispute.id
          }
        }
      ];
      
      await orderModel.update(orderId, {
        disputeStatus: 'won',
        timeline
      });
      
      return createSuccessResponse({ message: 'Dispute funds reinstated', orderId }, 200);
    }

    if (eventType === 'charge.dispute.funds_withdrawn') {
      const dispute = stripeEvent.data?.object;
      const paymentIntentId = dispute?.payment_intent;
      
      let order = null;
      let orderId = null;
      
      if (paymentIntentId) {
        try {
          const found = await orderModel.listByPaymentIntent(paymentIntentId);
          if (found && found.length > 0) {
            order = found[0];
            orderId = order.id || order._id;
          }
        } catch (e) {
          console.warn('Error finding order for dispute funds withdrawn', e.message);
        }
      }
      
      if (!orderId) {
        console.warn('Dispute funds withdrawn but no order found', { paymentIntentId });
        return createSuccessResponse({ message: 'Dispute funds withdrawn but order not found' }, 200);
      }
      
      const now = new Date().toISOString();
      const timeline = [
        ...(order.timeline || []),
        {
          at: now,
          type: 'dispute_funds_withdrawn',
          actor: 'system',
          actorType: 'system',
          actorId: 'system',
          meta: {
            disputeId: dispute.id
          }
        }
      ];
      
      await orderModel.update(orderId, {
        disputeStatus: 'lost',
        timeline
      });
      
      return createSuccessResponse({ message: 'Dispute funds withdrawn', orderId }, 200);
    }

    // Log unhandled event types for monitoring
    console.warn('Unhandled Stripe event type:', eventType);
    return createSuccessResponse({ message: 'Event ignored', type: eventType }, 200);
    
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return createErrorResponse(error.message, 500);
  }
};