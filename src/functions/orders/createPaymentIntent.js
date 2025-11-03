import { orderModel } from '/opt/nodejs/models/Order.js';
import { ProductModel } from '/opt/nodejs/models/Product.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';
import { ORDER_STATUSES } from '/opt/nodejs/constants/orderStatus.js';

/*Purpose: Creates a Stripe Payment Intent for a digital order after it’s approved.
Flow:
Checks user authentication and order ownership.
Ensures order status is APPROVED and product is digital.
Creates a Stripe Payment Intent (or simulates one if Stripe is not configured).
Returns: clientSecret for frontend to use with Stripe Elements (direct card entry).*/

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
    if (order.userId !== userId) return createErrorResponse('Only buyer can initiate payment', 403);
    if (order.status !== ORDER_STATUSES.APPROVED) {
      return createErrorResponse('Order must be approved before payment', 409);
    }

    // Determine if digital (any item digital)
    const firstProductEntry = Array.isArray(order.products) && order.products.length > 0
      ? order.products[0]
      : (order.items?.[0] || null);
    const productModel = new ProductModel();
    let product = null;
    if (firstProductEntry) {
      const pid = firstProductEntry.productId || firstProductEntry.product?.id || firstProductEntry.product?._id;
      if (pid) product = await productModel.getById(pid);
    }
    const isDigital = !!product?.isDigital;
    if (!isDigital) {
      return createErrorResponse('Payment is only required for digital products', 400);
    }

    const amountCents = Math.round((order.total || 0) * 100);
    if (amountCents <= 0) return createErrorResponse('Invalid order amount', 400);

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    let clientSecret;
    if (stripeKey) {
      try {
        // Lazy import stripe to avoid bundling if not configured
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(stripeKey);
        const intent = await stripe.paymentIntents.create({
          amount: amountCents,
          currency: 'usd',
          metadata: { orderId },
          automatic_payment_methods: { enabled: true }
        });
        clientSecret = intent.client_secret;
      } catch (e) {
        console.error('Stripe intent creation failed:', e.message);
        return createErrorResponse('Payment initialization failed', 500);
      }
    } else {
      // Simulated secret for environments without Stripe configured
      clientSecret = 'demo_client_secret_' + orderId;
    }

    const resp = createSuccessResponse({
      orderId,
      clientSecret,
      amount: order.total,
      currency: 'usd',
      simulated: !stripeKey
    });
    resp.headers = {
      ...resp.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'POST,OPTIONS'
    };
    return resp;
  } catch (error) {
    console.error('Create payment intent error:', error);
    const err = createErrorResponse(error.message, 500);
    err.headers = {
      ...err.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'POST,OPTIONS'
    };
    return err;
  }
};
