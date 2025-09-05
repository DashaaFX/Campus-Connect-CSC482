import { productModel } from '/opt/nodejs/models/Product.js';
import { createSuccessResponse, createErrorResponse, parseJSONBody, validateRequiredFields } from '/opt/nodejs/utils/response.js';

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

    // Only seller can update their product
    if (existingProduct.sellerId !== userId) {
      return createErrorResponse('Not authorized to update this product', 403);
    }

    const body = parseJSONBody(event.body);
    
    const updateData = {
      ...body,
      updatedAt: new Date().toISOString()
    };

    // Remove fields that shouldn't be updated
    delete updateData.sellerId;
    delete updateData.sellerEmail;
    delete updateData.createdAt;

    const updatedProduct = await productModel.update(productId, updateData);

    return createSuccessResponse({
      message: 'Product updated successfully',
      product: updatedProduct
    });

  } catch (error) {
    console.error('Update product error:', error);
    return createErrorResponse(error.message, 500);
  }
};
