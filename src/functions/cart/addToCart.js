import { cartModel } from '/opt/nodejs/models/Cart.js';
import { productModel } from '/opt/nodejs/models/Product.js';
import { createSuccessResponse, createErrorResponse, parseJSONBody, validateRequiredFields } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
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
    const product = await productModel.get(productId);
    if (!product) {
      return createErrorResponse('Product not found', 404);
    }

    // Validate quantity
    if (quantity <= 0) {
      return createErrorResponse('Quantity must be greater than 0', 400);
    }

    // Get current cart
    let cart = await cartModel.get(userId);
    if (!cart) {
      cart = { userId: userId, items: [], total: 0 };
    }

    // Find existing item or add new one
    const existingItemIndex = cart.items.findIndex(item => item.productId === productId);
    
    if (existingItemIndex >= 0) {
      // Update quantity of existing item
      cart.items[existingItemIndex].quantity = quantity;
    } else {
      // Add new item
      cart.items.push({
        productId,
        name: product.name,
        price: product.price,
        quantity,
        image: product.image
      });
    }

    // Recalculate total
    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cart.updatedAt = new Date().toISOString();

    await cartModel.update(userId, cart);

    return createSuccessResponse({
      message: 'Item added to cart successfully',
      cart
    });

  } catch (error) {
    console.error('Add to cart error:', error);
    return createErrorResponse(error.message, 500);
  }
};
