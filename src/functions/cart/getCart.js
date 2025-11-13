//Baljinnyam Puntsagnorov
import { CartModel } from '/opt/nodejs/models/Cart.js';
import { ProductModel } from '/opt/nodejs/models/Product.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';

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
    
    // Get user info from JWT authorizer context
    const userId = event.requestContext?.authorizer?.userId;
    
    
    if (!userId) {
      return createErrorResponse('User authentication required', 401);
    }

    const cartModel = new CartModel();
    const cart = await cartModel.getByUserId(userId);
    
    
    // If cart has items, fetch full product details for each item
    if (cart?.items?.length > 0) {
      const productModel = new ProductModel();
      
      
      // First, clean up items to ensure they all have productId
      cart.items = cart.items.filter(item => item && item.productId);
      
      const itemsWithProducts = await Promise.all(
        cart.items.map(async (item) => {
          if (!item.productId) {
            console.warn('Item without productId found in cart:', item);
            return {
              ...item,
              product: {
                id: 'unknown',
                title: 'Invalid product',
                price: parseFloat(item.price || 0)
              }
            };
          }
          
          try {
            const product = await productModel.getById(item.productId);
            
            if (!product) {
              console.warn(`Product ${item.productId} not found in database`);
              return {
                ...item,
                product: {
                  id: item.productId,
                  title: 'Product not found',
                  price: parseFloat(item.price || 0)
                }
              };
            }
            
            // Ensure price is properly formatted as a number and all required fields are present
            const cleanProduct = { 
              ...product,
              id: product.id || item.productId,
              title: product.title || product.name || 'Unknown Product',
              price: parseFloat(product.price || 0),
              category: product.category || 'uncategorized',
              images: Array.isArray(product.images) ? product.images : []
            };            
    
            
            return {
              ...item,
              product: cleanProduct
            };
          } catch (error) {
            console.error(`Error fetching product ${item.productId}:`, error);
            return {
              ...item,
              product: {
                id: item.productId,
                title: 'Error loading product',
                price: parseFloat(item.price || 0)
              }
            };
          }
        })
      );
      
      cart.items = itemsWithProducts;
    }

    const response = createSuccessResponse({
      items: cart?.items || [],
      total: cart?.total || 0
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
    console.error('Get cart error:', error);
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
