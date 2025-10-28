import { ProductModel } from '/opt/nodejs/models/Product.js';
import { orderModel } from '/opt/nodejs/models/Order.js';
import { downloadLogModel } from '/opt/nodejs/models/DownloadLog.js';
import { TIMELINE_EVENTS } from '/opt/nodejs/constants/timelineEventTypes.js';
import { DOWNLOAD_ENTITLEMENT_STATUSES } from '/opt/nodejs/constants/orderStatus.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// digital product download handler
// seller or buyer with at least one approved/completed order containing product.
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET_NAME = process.env.UPLOADS_BUCKET || 'campus-connect-uploads';
// Entitlement now requires paid or completed status (except seller bypass)

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
      },
      body: JSON.stringify({})
    };
  }
  try {
    const userId = event.requestContext?.authorizer?.userId;
    if (!userId) return createErrorResponse('User authentication required', 401);
    const productId = event.pathParameters?.id;
    if (!productId) return createErrorResponse('Product ID required', 400);

    const productModel = new ProductModel();
    const product = await productModel.getById(productId);
    if (!product || !product.isDigital) return createErrorResponse('Product not found or not digital', 404);
    const documentKey = product.documentKey;
    if (!documentKey) return createErrorResponse('Digital asset not available yet', 409);
    if (!documentKey.startsWith('private/')) return createErrorResponse('Invalid digital asset key', 500);

    const isSeller = product.sellerId === userId || product.userId === userId;
    let entitled = isSeller;
    let grantingOrder = null;
    if (!entitled) {
      const buyerOrders = await orderModel.getByBuyer(userId) || [];
      const unlocked = buyerOrders.filter(o => DOWNLOAD_ENTITLEMENT_STATUSES.includes(o.status));
      for (const o of unlocked) {
        const match = o.items?.some(it => {
          const pid = it.productId || it.id || it.product?.id || it.product?._id || it.product?.productId;
          return pid === productId;
        });
        if (match) { grantingOrder = o; entitled = true; break; }
      }
      if (!entitled) return createErrorResponse('No paid or completed order grants access to this digital product', 403);
      // If any granting order requires review (fraud flag), block download until resolved
      const needsReview = unlocked.some(o => o.requiresReview);
      if (needsReview) {
        try { await orderModel.update(grantingOrder.id, { timeline: [...(grantingOrder.timeline||[]), { at: new Date().toISOString(), type: TIMELINE_EVENTS.DOWNLOAD_BLOCKED_REVIEW, actor: userId, actorType: 'user', actorId: userId, meta: { productId } }] }); } catch(_) {}
        return createErrorResponse('Download temporarily blocked pending payment review', 423);
      }
      // If the granting order was later refunded, explicitly block with clearer message
      const refunded = buyerOrders.some(o => o.status === 'refunded' && o.items?.some(it => {
        const pid = it.productId || it.id || it.product?.id || it.product?._id || it.product?.productId;
        return pid === productId;
      }));
      if (refunded) {
        try { await orderModel.update(grantingOrder.id, { timeline: [...(grantingOrder.timeline||[]), { at: new Date().toISOString(), type: TIMELINE_EVENTS.DOWNLOAD_BLOCKED_REFUND, actor: userId, actorType: 'user', actorId: userId, meta: { productId } }] }); } catch(_) {}
        return createErrorResponse('Download disabled (order refunded)', 410);
      }
    }

    // Rate limiting (per hour per granting order). Sellers bypass limit.
    if (!isSeller && grantingOrder?.id) {
      const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const recentCount = await downloadLogModel.countRecent(grantingOrder.id, windowStart);
      const limit = downloadLogModel.getLimit();
      if (recentCount >= limit) {
        // Treat rate limit as attempt but blocked (reuse refund/review not specified, keep generic attempt record?)
        try { await orderModel.update(grantingOrder.id, { timeline: [...(grantingOrder.timeline||[]), { at: new Date().toISOString(), type: TIMELINE_EVENTS.DOWNLOAD_ATTEMPT, actor: userId, actorType: 'user', actorId: userId, meta: { productId, blocked: 'rate_limit' } }] }); } catch(_) {}
        return createErrorResponse(`Rate limit exceeded (${limit}/hour)`, 429);
      }
    }

    const safeName = encodeURIComponent(product.documentOriginalName || `download-${productId}.${product.digitalFormat || 'pdf'}`);
    const expiresSeconds = 120; // short-lived URL
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: documentKey,
      ResponseContentDisposition: `attachment; filename="${safeName}"`
    });
  const url = await getSignedUrl(s3Client, command, { expiresIn: expiresSeconds });

    // Atomic best-effort download count increment (no race conditions)
    try {
      await productModel.incrementDigitalDownloadCount(productId);
      if (grantingOrder?.id) {
        await downloadLogModel.logAttempt({ orderId: grantingOrder.id, userId, productId });
        // Log successful attempt
        try { await orderModel.update(grantingOrder.id, { timeline: [...(grantingOrder.timeline||[]), { at: new Date().toISOString(), type: TIMELINE_EVENTS.DOWNLOAD_ATTEMPT, actor: userId, actorType: 'user', actorId: userId, meta: { productId, success: true } }] }); } catch(_) {}
      }
    } catch (_) { /* ignore metric failures */ }

  const resp = createSuccessResponse({ url, expiresIn: expiresSeconds });
    resp.headers = {
      ...resp.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,OPTIONS'
    };
    return resp;
  } catch (error) {
    console.error('Download digital product error:', error);
    const errResp = createErrorResponse(error.message, 500);
    errResp.headers = {
      ...errResp.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,OPTIONS'
    };
    return errResp;
  }
};
