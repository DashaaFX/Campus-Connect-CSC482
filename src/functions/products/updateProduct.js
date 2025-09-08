import { ProductModel } from '/opt/nodejs/models/Product.js';
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
    const productModel = new ProductModel();
    console.log(`Updating product with ID: ${productId}`);
    
    // Try to get the product by ID
    let existingProduct = await productModel.getById(productId);
    
    // If not found, try using different ID formats
    if (!existingProduct) {
      console.log(`Product not found with direct ID, trying alternative ID formats`);
      
      // Get all products and find match by _id or id
      const allProducts = await productModel.getAll();
      existingProduct = allProducts.find(p => 
        p.id === productId || 
        p._id === productId ||
        p.id?.toString() === productId.toString() || 
        p._id?.toString() === productId.toString()
      );
      
      if (existingProduct) {
        console.log(`Found product using alternative ID match: ${existingProduct.id || existingProduct._id}`);
      }
    }
    if (!existingProduct) {
      return createErrorResponse('Product not found', 404);
    }

    // Only seller can update their product
    if (existingProduct.sellerId !== userId) {
      return createErrorResponse('Not authorized to update this product', 403);
    }

    const body = parseJSONBody(event.body);
    
    // Don't explicitly add updatedAt, it's handled by the BaseModel.update method
    const updateData = {
      ...body
    };

    // Remove fields that shouldn't be updated
    delete updateData.sellerId;
    delete updateData.sellerEmail;
    delete updateData.createdAt;
    delete updateData.updatedAt; // Remove if present in request body

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
