import { ProductModel } from '/opt/nodejs/models/Product.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';
import { SubcategoryModel } from '/opt/nodejs/models/subcategoryModel.js';
import { OrderModel } from '/opt/nodejs/models/Order.js';

export const handler = async (event) => {
  // Handle CORS preflight requests
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
  const productId = event.pathParameters?.id;
  const userId = event.requestContext?.authorizer?.userId; // may be undefined for public requests
    
    if (!productId) {
      return createErrorResponse('Product ID is required', 400);
    }

    const productModel = new ProductModel();
    
    // Try to get the product by ID
    let product = await productModel.getById(productId);
    
    // If not found, try using different ID formats
    if (!product) {
      // Get all products and find match by _id or id
      const allProducts = await productModel.getAll();
      product = allProducts.find(p => 
        p.id === productId || 
        p._id === productId ||
        p.id?.toString() === productId.toString() || 
        p._id?.toString() === productId.toString()
      );
    }
    
    if (!product) {
      return createErrorResponse('Product not found', 404);
    }

    // Determine entitlement for digital products (buyer who purchased or seller)
    let userOwns = false;
    let isSeller = false;
    if (product.isDigital && userId) {
      try {
        // Seller always has access
        if (product.sellerId && product.sellerId === userId) {
          isSeller = true;
          userOwns = true;
        } else {
          // Scan user orders for entitlement (optimization: future index/attribute)
            const orderModel = new OrderModel();
            const buyerOrders = await orderModel.getByBuyer(userId);
            if (buyerOrders && buyerOrders.length > 0) {
              for (const o of buyerOrders) {
                if (!o || !o.items) continue;
                const hasItem = o.items.some(it => {
                  const pid = it.productId || it.product?.id || it.product?._id;
                  return pid === productId || pid === product.id || pid === product._id;
                });
                if (hasItem && (o.status === 'completed' || o.status === 'paid' || o.status === 'delivered')) {
                  userOwns = true;
                  break;
                }
              }
            }
        }
      } catch (entErr) {
        console.error('Entitlement check failed:', entErr.message);
      }
    }
    
    // Enhance product with subcategory name if it exists as an ID
    if (product.subcategory && typeof product.subcategory === 'string' && !product.subcategory.name) {
      try {
        const subcategory = await SubcategoryModel.getById(product.subcategory);
        if (subcategory) {
          product.subcategory = {
            id: product.subcategory,
            _id: product.subcategory,
            name: subcategory.name,
            description: subcategory.description
          };
        }
      } catch (error) {
        console.error('Error fetching subcategory:', error);
        // Keep original subcategory ID if error occurs
      }
    }

    // Sanitize digital sensitive fields if user not entitled
    let sanitized = product;
    if (product.isDigital) {
      const { documentKey, ...rest } = product;
      sanitized = { ...rest };
      // Provide flags for frontend gating
      sanitized.userOwns = userOwns;
      sanitized.isSeller = isSeller;
      sanitized.digitalAccess = userOwns ? 'full' : 'preview';
      // Never return documentKey here (download served via dedicated endpoint later)
    }

    const response = createSuccessResponse({ product: sanitized });
    
    // Add CORS headers
    response.headers = {
      ...response.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,OPTIONS'
    };
    
    return response;

  } catch (error) {
    console.error('Get product error:', error);
    const errorResponse = createErrorResponse(error.message, 500);
    
    // Add CORS headers to error response too
    errorResponse.headers = {
      ...errorResponse.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,OPTIONS'
    };
    
    return errorResponse;
  }
};
