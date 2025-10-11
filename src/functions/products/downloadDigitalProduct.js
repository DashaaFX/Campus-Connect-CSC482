import { ProductModel } from '/opt/nodejs/models/Product.js';
import { orderModel } from '/opt/nodejs/models/Order.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// digital product download handler
// seller or buyer with at least one approved/completed order containing product.
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET_NAME = process.env.UPLOADS_BUCKET || 'campus-connect-uploads';
const UNLOCK_STATUSES = ['approved', 'completed'];

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
    if (!entitled) {
      const buyerOrders = await orderModel.getByBuyer(userId) || [];
      const unlocked = buyerOrders.filter(o => {
        const st = (o.status || '').toLowerCase();
        return UNLOCK_STATUSES.some(base => st === base || st === base + 'd');
      });
      entitled = unlocked.some(o => o.items?.some(it => {
        const pid = it.productId || it.id || it.product?.id || it.product?._id || it.product?.productId;
        return pid === productId;
      }));
      if (!entitled) return createErrorResponse('No approved or completed order grants access to this digital product', 403);
    }

    const safeName = encodeURIComponent(product.documentOriginalName || `download-${productId}.${product.digitalFormat || 'pdf'}`);
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: documentKey,
      ResponseContentDisposition: `attachment; filename="${safeName}"`
    });
    const url = await getSignedUrl(s3Client, command, { expiresIn: 60 });

    // Best-effort download count increment
    try {
      const currentCount = product.digitalDownloadCount || 0;
      await productModel.update(productId, { digitalDownloadCount: currentCount + 1, updatedAt: new Date().toISOString() });
    } catch (_) { /* ignore metric failures */ }

    const resp = createSuccessResponse({ url, expiresIn: 60 });
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
