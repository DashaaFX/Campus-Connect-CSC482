import { orderModel } from '/opt/nodejs/models/Order.js';
import { ProductModel } from '/opt/nodejs/models/Product.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
  try {
    // Get user info from JWT authorizer context
    const userId = event.requestContext?.authorizer?.userId;
    
    if (!userId) {
      return createErrorResponse('User authentication required', 401);
    }

    // Check if this is a product-orders request
    if (event.path === '/orders/product-orders') {
      const productId = event.queryStringParameters?.productId;
      if (!productId) {
        return createErrorResponse('Product ID required as query parameter', 400);
      }

      // Get orders for a specific product (only if the user is the seller)
      const orders = await orderModel.getByProductAndSeller(productId, userId);
      return createSuccessResponse({
        orders: orders || []
      });
    }

    // Regular order retrieval by ID
    const orderId = event.pathParameters?.id;
    if (!orderId) {
      return createErrorResponse('Order ID required', 400);
    }

    const order = await orderModel.get(orderId);
    if (!order) {
      return createErrorResponse('Order not found', 404);
    }

    // Users can only view their own orders (as buyer or seller)
    if (order.userId !== userId && order.sellerId !== userId) {
      return createErrorResponse('Not authorized to view this order', 403);
    }

    // Enrich single order with minimal digital metadata
    try {
      if (order && Array.isArray(order.items) && order.items.length) {
        const productModel = new ProductModel();
        const cache = {};
        for (const it of order.items) {
          const pid = it.product?.id || it.product?._id || it.productId;
            if (!pid) continue;
          const hasDigitalInfo = it.product && (typeof it.product.isDigital === 'boolean');
          if (!hasDigitalInfo && !cache.hasOwnProperty(pid)) {
            try {
              const p = await productModel.getById(pid);
              if (p) {
                cache[pid] = {
                  id: p.id || pid,
                  isDigital: !!p.isDigital,
                  digitalFormat: p.isDigital ? p.digitalFormat : null,
                  previewImage: p.isDigital ? (p.previewImage || null) : null,
                  title: p.title || p.name,
                  price: p.price,
                };
              } else {
                cache[pid] = null;
              }
            } catch (_) {
              cache[pid] = null;
            }
          }
        }
        for (const it of order.items) {
          const pid = it.product?.id || it.product?._id || it.productId;
          if (!pid) continue;
          if (!it.product) it.product = { id: pid };
          const meta = cache[pid];
          if (meta) {
            if (typeof it.product.isDigital !== 'boolean') it.product.isDigital = meta.isDigital;
            if (it.product.digitalFormat == null) it.product.digitalFormat = meta.digitalFormat;
            if (!it.product.previewImage && meta.previewImage) it.product.previewImage = meta.previewImage;
            if (!it.product.title && meta.title) it.product.title = meta.title;
            if (it.product.price == null && meta.price != null) it.product.price = meta.price;
          }
        }
      }
    } catch (enrichErr) {
      console.error('Single order enrichment error:', enrichErr);
    }

    return createSuccessResponse({
      order
    });

  } catch (error) {
    console.error('Get order error:', error);
    return createErrorResponse(error.message, 500);
  }
};
