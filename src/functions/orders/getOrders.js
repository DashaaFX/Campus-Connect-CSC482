import { OrderModel, orderModel } from '/opt/nodejs/models/Order.js';
import { ProductModel } from '/opt/nodejs/models/Product.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';

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
    
    if (!userId) {
      return createErrorResponse('User authentication required', 401);
    }

    // Check if this is a seller orders request
    const isSeller = event.path === '/orders/seller-orders';
    
    let orders = [];
    
    if (isSeller) {
      // Get orders where the user is the seller
      orders = await orderModel.getBySeller(userId);
    } else {
      // Get orders where the user is the buyer

      orders = await orderModel.getByBuyer(userId);
    }

    // Enrich orders with minimal digital product metadata 
    try {
      if (orders && orders.length) {
        const productModel = new ProductModel();
        const idSet = new Set();
        for (const o of orders) {
          for (const it of (o.items || [])) {
            const pid = it.product?.id || it.product?._id || it.productId;
            if (!pid) continue;
            const hasDigitalInfo = it.product && (typeof it.product.isDigital === 'boolean');
            if (!hasDigitalInfo) idSet.add(pid);
          }
        }
        const cache = {};
        for (const pid of idSet) {
          try {
            const p = await productModel.getById(pid);
            if (p) {
              cache[pid] = {
                id: p.id || pid,
                isDigital: !!p.isDigital,
                digitalFormat: p.isDigital ? p.digitalFormat : null,
                previewImage: p.isDigital ? (p.previewImage || null) : null,
                title: p.title ,
                price: p.price,
              };
            }
          } catch (e) {  }
        }
        for (const o of orders) {
          for (const it of (o.items || [])) {
            const pid = it.product?.id || it.product?._id || it.productId;
            if (!pid) continue;
            if (!it.product) it.product = { id: pid };
            if (cache[pid]) {
              // Only set fields if absent to avoid overwriting fuller product objects
              if (typeof it.product.isDigital !== 'boolean') it.product.isDigital = cache[pid].isDigital;
              if (it.product.digitalFormat == null) it.product.digitalFormat = cache[pid].digitalFormat;
              if (!it.product.previewImage && cache[pid].previewImage) it.product.previewImage = cache[pid].previewImage;
              if (!it.product.title && cache[pid].title) it.product.title = cache[pid].title;
              if (it.product.price == null && cache[pid].price != null) it.product.price = cache[pid].price;
            }
          }
        }
      }
    } catch (enrichErr) {
      console.error('Order enrichment error:', enrichErr);
    }

    const response = createSuccessResponse({
      orders: orders || [],
      isSeller: isSeller
    });
    
    // Add CORS headers
    response.headers = {
      ...response.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,OPTIONS'
    };
    
    return response;

  } catch (error) {
    console.error('Get orders error:', error);
    const errorResponse = createErrorResponse(error.message, 500);
    
    // Add CORS headers to error response
    errorResponse.headers = {
      ...errorResponse.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,OPTIONS'
    };
    
    return errorResponse;
  }
};
