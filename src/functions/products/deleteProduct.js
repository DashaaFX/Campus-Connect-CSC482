import { productModel } from '/opt/nodejs/models/Product.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
  try {
    // Get user info from JWT authorizer context
    const userId = event.requestContext?.authorizer?.userId;
    
    if (!userId) {
      return createErrorResponse('User authentication required', 401);
    }

    const productId = event.pathParameters?.id;
    if (!productId) {
      return createErrorResponse('Product ID required', 400);
    }

    // Get existing product to verify ownership
    const existingProduct = await productModel.get(productId);
    if (!existingProduct) {
      return createErrorResponse('Product not found', 404);
    }

    // Only seller can delete their product
    if (existingProduct.sellerId !== userId) {
      return createErrorResponse('Not authorized to delete this product', 403);
    }

    // Soft delete by deactivating the product
    await productModel.update(productId, { 
      status: 'inactive',
      updatedAt: new Date().toISOString()
    });

    return createSuccessResponse({
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('Delete product error:', error);
    return createErrorResponse(error.message, 500);
  }
};
