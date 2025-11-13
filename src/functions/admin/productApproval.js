import { ProductModel } from '/opt/nodejs/models/Product.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';
import { UserModel } from '/opt/nodejs/models/User.js';
const CORS_HEADERS = {  
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'POST,OPTIONS'
};
// List all products for admin approval page
export async function listAllProducts(event) {
  const userId = event.requestContext?.authorizer?.userId;
  if (!userId) return { ...createErrorResponse('User authentication required', 401), headers: CORS_HEADERS };
  const userModel = new UserModel();
  const user = await userModel.getById(userId);
  if (!user || user.role !== 'Admin') return { ...createErrorResponse('Admin access required', 403), headers: CORS_HEADERS };

  const productModel = new ProductModel();
  const all = await productModel.getAll();
  // Only active products
  const filtered = all.filter(p => p.active !== false);
  // Add type and main image for frontend
  const products = filtered.map(p => ({
    ...p,
    type: p.isDigital ? 'digital' : 'physical',
    mainImage: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null
  }));
  return createSuccessResponse({ products });
}

// Approve product
export async function approveProduct(event) {
  const userId = event.requestContext?.authorizer?.userId;
  if (!userId) return { ...createErrorResponse('User authentication required', 401), headers: CORS_HEADERS };
  const userModel = new UserModel();
  const user = await userModel.getById(userId);
  if (!user || user.role !== 'Admin') return { ...createErrorResponse('Admin access required', 403), headers: CORS_HEADERS };

  const productId = event.pathParameters?.id || event.path.split('/').pop();
  if (!productId) return createErrorResponse('Product ID required', 400);
  const productModel = new ProductModel();
  const updated = await productModel.updateStatus(productId, 'approved');
  return createSuccessResponse({ success: true, product: updated });
}

// Reject product (can reject pending or approved)
export async function rejectProduct(event) {
  const userId = event.requestContext?.authorizer?.userId;
  if (!userId) return { ...createErrorResponse('User authentication required', 401), headers: CORS_HEADERS };
  const userModel = new UserModel();
  const user = await userModel.getById(userId);
  if (!user || user.role !== 'Admin') return { ...createErrorResponse('Admin access required', 403), headers: CORS_HEADERS };

  const productId = event.pathParameters?.id || event.path.split('/').pop();
  if (!productId) return createErrorResponse('Product ID required', 400);
  const productModel = new ProductModel();
  const product = await productModel.getById(productId);
  if (!product) return createErrorResponse('Product not found', 404);
  // Allow rejection if status is pending or approved
  if (product.status !== 'pending' && product.status !== 'approved') {
    return createErrorResponse('Only pending or approved products can be rejected', 400);
  }
  const updated = await productModel.updateStatus(productId, 'rejected');
  return createSuccessResponse({ success: true, product: updated });
}
// Download digital product (admin only)
export async function downloadDigitalProductAdmin(event) {
  const userId = event.requestContext?.authorizer?.userId;
  if (!userId) return { ...createErrorResponse('User authentication required', 401), headers: CORS_HEADERS };
  const userModel = new UserModel();
  const user = await userModel.getById(userId);
  if (!user || user.role !== 'Admin') return { ...createErrorResponse('Admin access required', 403), headers: CORS_HEADERS };

  const productId = event.pathParameters?.id || event.path.split('/').pop();
  if (!productId) return createErrorResponse('Product ID required', 400);
  const productModel = new ProductModel();
  const product = await productModel.getById(productId);
  if (!product || !product.isDigital) return createErrorResponse('Product not found or not digital', 404);
  const documentKey = product.documentKey;
  if (!documentKey) return createErrorResponse('Digital asset not available yet', 409);
  // Generate signed S3 URL (reuse logic from downloadDigitalProduct.js)
  // For admin, bypass entitlement checks
  const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
  const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
  const url = await getSignedUrl(s3Client, new GetObjectCommand({ Bucket: process.env.UPLOADS_BUCKET || 'campus-connect-uploads', Key: documentKey }), { expiresIn: 60 });
  return createSuccessResponse({ url });
}

// View product details (admin)
export async function viewProduct(event) {
  const userId = event.requestContext?.authorizer?.userId;
  if (!userId) return { ...createErrorResponse('User authentication required', 401), headers: CORS_HEADERS };
  const userModel = new UserModel();
  const user = await userModel.getById(userId);
  if (!user || user.role !== 'Admin') return { ...createErrorResponse('Admin access required', 403), headers: CORS_HEADERS };

  const productId = event.pathParameters?.id || event.path.split('/').pop();
  if (!productId) return createErrorResponse('Product ID required', 400);
  const productModel = new ProductModel();
  const product = await productModel.getById(productId);
  if (!product) return createErrorResponse('Product not found', 404);
  return createSuccessResponse({ product });
}

// CORS preflight handler for /admin/products/{id}
export async function optionsProduct(event) {
  // Always return 200 OK with CORS headers
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: ''
  };
}