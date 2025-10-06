//Baljinnyam Puntsagnorov
import { CartModel } from '/opt/nodejs/models/Cart.js';
import { ProductModel } from '/opt/nodejs/models/Product.js';
import { createSuccessResponse, createErrorResponse, parseJSONBody, validateRequiredFields } from '/opt/nodejs/utils/response.js';

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
    
    if (!userId) {
      return createErrorResponse('User authentication required', 401);
    }

    const body = parseJSONBody(event.body);
    
    const requiredFields = ['productId', 'quantity'];
    const validation = validateRequiredFields(body, requiredFields);
    if (!validation.isValid) {
      return createErrorResponse(validation.message, 400);
    }

    const { productId, quantity } = body;

    // Verify product exists
    const productModel = new ProductModel();
    const product = await productModel.getById(productId);
    if (!product) {
      return createErrorResponse('Product not found', 404);
    }

    // Validate quantity
    if (quantity <= 0) {
      return createErrorResponse('Quantity must be greater than 0', 400);
    }
    
    // Check if stock is sufficient
    if (typeof product.stock !== 'undefined' && product.stock < quantity) {
      return createErrorResponse(`Insufficient stock. Only ${product.stock} units available.`, 400);
    }

    // Get current cart
    const cartModel = new CartModel();
    let cart = await cartModel.getByUserId(userId);
    
    // Ensure cart has required properties
    if (!cart || !cart.items) {
      cart = { userId: userId, items: [], total: 0 };
    }
    
    if (!Array.isArray(cart.items)) {
      cart.items = [];
    }

    // Before persisting, enforce cumulative stock limit if item already in cart
    const existing = Array.isArray(cart.items) ? cart.items.find(it => it.productId === productId) : null;
    if (existing && typeof product.stock !== 'undefined') {
      const newTotalQty = existing.quantity + quantity;
      if (newTotalQty > product.stock) {
        return createErrorResponse(`Cannot add ${quantity} more units. Only ${product.stock} total units available and you already have ${existing.quantity} in your cart.`, 400);
      }
    }

    // Build normalized product payload including seller metadata
    const normalizedProduct = {
      _id: product.id || product._id,
      id: product.id || product._id,
      title: product.title || product.name,
      name: product.name || product.title,
      price: product.price,
      images: product.images || [],
      description: product.description || "",
      sellerId: product.sellerId || product.userId,
      userId: product.userId || product.sellerId,
      sellerEmail: product.sellerEmail || product.userEmail || undefined
    };

    // Persist via model helper (this will upsert and handle existing quantity increment)
    await cartModel.addItem(userId, productId, quantity, {
      product: normalizedProduct,
      sellerId: normalizedProduct.sellerId
    });

    // Re-fetch latest cart (to return unified view) after mutation
    const updatedCart = await cartModel.getByUserId(userId);

    // Recalculate total just in case
    updatedCart.total = Array.isArray(updatedCart.items)
      ? updatedCart.items.reduce((sum, item) => {
          const price = item.product?.price || item.price || 0;
          return sum + (price * item.quantity);
        }, 0)
      : 0;
    updatedCart.updatedAt = new Date().toISOString();

    const response = createSuccessResponse({
      message: 'Item added to cart successfully',
      cart: updatedCart
    });
    
    // Add CORS headers
    response.headers = {
      ...response.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'POST,OPTIONS'
    };
    
    return response;

  } catch (error) {
    console.error('Add to cart error:', error);
    const errorResponse = createErrorResponse(error.message, 500);
    
    // Add CORS headers to error response too
    errorResponse.headers = {
      ...errorResponse.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'POST,OPTIONS'
    };
    
    return errorResponse;
  }
};
