import { OrderModel } from '/opt/nodejs/models/Order.js';
import { CartModel } from '/opt/nodejs/models/Cart.js';
import { ProductModel } from '/opt/nodejs/models/Product.js';
import { createSuccessResponse, createErrorResponse, parseJSONBody, validateRequiredFields } from '/opt/nodejs/utils/response.js';
import { ORDER_STATUSES, OPEN_ORDER_STATUSES } from '/opt/nodejs/constants/orderStatus.js';

export const handler = async (event) => {
  // Handle CORS preflight requests
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
    // Get user info from JWT authorizer context
    const userId = event.requestContext?.authorizer?.userId;
    const email = event.requestContext?.authorizer?.email;
    
    if (!userId) {
      return createErrorResponse('User authentication required', 401);
    }

    const body = parseJSONBody(event.body);
    
    const requiredFields = ['shippingAddress'];
    const validation = validateRequiredFields(body, requiredFields);
    if (!validation.isValid) {
      return createErrorResponse(validation.message, 400);
    }

    // Get user's cart
    const cartModel = new CartModel();
    const cart = await cartModel.getByUserId(userId);
    if (!cart || !cart.items || cart.items.length === 0) {
      return createErrorResponse('Cart is empty', 400);
    }

  // Group cart items by sellerId (derive when missing)
    const productModel = new ProductModel();
    const items = cart.items;

    // Ensure each item has sellerId at item level and in product
    for (const it of items) {
      const existingSeller = it.sellerId || it.product?.sellerId || it.product?.userId;

      if (!existingSeller) {
        // Fallback: fetch product once to enrich (no extensive logging per instructions)
        try {
          const pId = it.productId || it.product?.id || it.product?._id;
          if (pId) {
            const full = await productModel.getById(pId);
            if (full && (full.sellerId || full.userId)) {
              const sid = full.sellerId || full.userId;
              it.sellerId = sid;
              if (it.product) {
                it.product.sellerId = it.product.sellerId || sid;
              }
            }
          }
        } catch (_) { /* silent */ }
      } else {
        it.sellerId = existingSeller;
        if (it.product) {
          it.product.sellerId = it.product.sellerId || existingSeller;
        }
      }
      // Add per-product status field
      it.status = ORDER_STATUSES.REQUESTED;
    }

    // Validate every item has a sellerId after enrichment
    const missingSeller = items.find(it => !it.sellerId);
    if (missingSeller) {
      return createErrorResponse('One or more items are missing seller information. Refresh cart and try again.', 500);
    }

    // Group strictly by sellerId
    const groups = items.reduce((acc, it) => {
      acc[it.sellerId] = acc[it.sellerId] || [];
      acc[it.sellerId].push(it);
      return acc;
    }, {});

    const orderModel = new OrderModel();
    const createdOrders = [];
    const now = new Date().toISOString();

    for (const [sid, groupItems] of Object.entries(groups)) {
      // Prevent duplicate open order per product for this buyer
      const existingOrders = await orderModel.getByBuyer(userId);
      const openProductIds = new Set();
      for (const o of existingOrders || []) {
        if (OPEN_ORDER_STATUSES.includes(o.status)) {
          for (const it of o.items || []) {
            const pid = it.productId || it.product?.id || it.product?._id;
            if (pid) openProductIds.add(pid);
          }
        }
      }
      const duplicateItem = groupItems.find(it => {
        const pid = it.productId || it.product?.id || it.product?._id;
        return pid && openProductIds.has(pid);
      });
      if (duplicateItem) {
        // Skip creating order for this seller group; continue other groups
        console.error('Skipping duplicate open order creation for product', duplicateItem.productId);
        continue;
      }
      const total = groupItems.reduce((sum, it) => {
        const price = it.product?.price || it.price || 0;
        return sum + (price * it.quantity);
      }, 0);
      // Build products array for per-product status
      const products = groupItems.map(it => ({
        productId: it.productId || it.product?.id || it.product?._id,
        status: it.status || ORDER_STATUSES.REQUESTED,
        quantity: it.quantity,
        sellerId: it.sellerId,
        // Add other fields as needed
      }));
      const orderData = {
        userId,
        userEmail: email,
        items: groupItems, // legacy
        products, // per-product status
        total,
        sellerId: sid,
        shippingAddress: body.shippingAddress,
        status: ORDER_STATUSES.REQUESTED,
        timeline: [
          { at: now, type: 'requested', actor: userId }
        ],
        createdAt: now,
        updatedAt: now
      };
      const order = await orderModel.create(orderData);
      createdOrders.push(order);
    }

    // Clear cart only if at least one order created
    if (createdOrders.length > 0) {
      await cartModel.update(userId, { userId, items: [], total: 0 });
    }

    const payload = createdOrders.length === 1
      ? { message: 'Order created successfully', order: createdOrders[0], orders: createdOrders }
      : { message: 'Orders created successfully', orders: createdOrders };

    const response = createSuccessResponse(payload, 201);
    
    // Add CORS headers
    response.headers = {
      ...response.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'POST,OPTIONS'
    };
    
    return response;

  } catch (error) {
    console.error('Create order error:', error);
    const errorResponse = createErrorResponse(error.message, 500);
    
    // Add CORS headers to error response
    errorResponse.headers = {
      ...errorResponse.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'POST,OPTIONS'
    };
    
    return errorResponse;
  }
};


