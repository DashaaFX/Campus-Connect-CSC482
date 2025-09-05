import { productModel } from '/opt/nodejs/models/Product.js';
import { createSuccessResponse, createErrorResponse, parseJSONBody, validateRequiredFields } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
  try {
    // Get user info from JWT authorizer context
    const userId = event.requestContext?.authorizer?.userId;
    const email = event.requestContext?.authorizer?.email;
    
    if (!userId) {
      return createErrorResponse('User authentication required', 401);
    }

    const body = parseJSONBody(event.body);
    
    const requiredFields = ['name', 'description', 'price', 'category'];
    const validation = validateRequiredFields(body, requiredFields);
    if (!validation.isValid) {
      return createErrorResponse(validation.message, 400);
    }

    // Validate image URL if provided
    if (body.image && !body.image.startsWith('https://')) {
      return createErrorResponse('Image must be a valid HTTPS URL', 400);
    }

    const productData = {
      ...body,
      sellerId: userId,
      sellerEmail: email,
      image: body.image || null, // Optional image field
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const product = await productModel.create(productData);

    return createSuccessResponse({
      message: 'Product created successfully',
      product
    }, 201);

  } catch (error) {
    console.error('Create product error:', error);
    return createErrorResponse(error.message, 500);
  }
};
