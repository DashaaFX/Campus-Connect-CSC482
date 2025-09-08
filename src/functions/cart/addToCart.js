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

    // Get current cart
    const cartModel = new CartModel();
    let cart = await cartModel.getByUserId(userId);
    
    console.log('Retrieved cart for user', userId, ':', JSON.stringify(cart));
    
    // Ensure cart has required properties
    if (!cart || !cart.items) {
      cart = { userId: userId, items: [], total: 0 };
    }
    
    if (!Array.isArray(cart.items)) {
      cart.items = [];
    }

    // Find existing item or add new one
    const existingItemIndex = cart.items.findIndex(item => item.productId === productId);
    
    if (existingItemIndex >= 0) {
      // Update quantity of existing item
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      cart.items[existingItemIndex].quantity = newQuantity;
      console.log(`Updated existing cart item quantity to ${newQuantity}`);
    } else {
      // Add new item with full product details for easier display
      const cartItem = {
        productId: productId,
        product: {
          _id: product.id || product._id,
          id: product.id || product._id,
          name: product.name || product.title,
          title: product.title || product.name,
          price: product.price,
          images: product.images || [],
          description: product.description
        },
        quantity: quantity,
        addedAt: new Date().toISOString()
      };
      
      cart.items.push(cartItem);
      console.log('Added new item to cart:', cartItem);
    }

    // Recalculate total
    cart.total = cart.items.reduce((sum, item) => {
      const price = item.product?.price || item.price || 0;
      return sum + (price * item.quantity);
    }, 0);
    
    cart.updatedAt = new Date().toISOString();
    
    console.log('Saving cart:', JSON.stringify(cart));
    
    // Ensure we have a properly formatted product object to store
    const productData = {
      _id: product.id || product._id,
      id: product.id || product._id,
      title: product.title || product.name,
      name: product.name || product.title,
      price: product.price,
      images: product.images || [],
      description: product.description || ""
    };
    
    // Save the cart using addItem which handles create or update logic
    await cartModel.addItem(userId, productId, quantity, { 
      product: productData
    });

    const response = createSuccessResponse({
      message: 'Item added to cart successfully',
      cart
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
