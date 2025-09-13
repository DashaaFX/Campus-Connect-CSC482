import { ProductModel } from '/opt/nodejs/models/Product.js';
import { createSuccessResponse, createErrorResponse, parseJSONBody, validateRequiredFields } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
  try {
    // Get authentication info from authorizer
    const userId = event.requestContext?.authorizer?.userId;
    const userEmail = event.requestContext?.authorizer?.email;
    
    // Fail if no authentication
    if (!userId) {
      console.error('No userId found in authorizer context');
      return createErrorResponse('User authentication required', 401);
    }
    
    // Parse the request body
    let body;
    try {
      body = parseJSONBody(event.body);
    } catch (e) {
      console.error('Error parsing body:', e);
      return createErrorResponse('Invalid request body', 400);
    }
    
    // Force sellerId to be the authenticated user
    body.sellerId = userId;
    
    // Validate required fields
    const requiredFields = ['title', 'description', 'price', 'category'];
    const validation = validateRequiredFields(body, requiredFields);
    if (!validation.isValid) {
      return createErrorResponse(validation.message, 400);
    }

    // Validate and convert data types
    const price = parseFloat(body.price);
    if (isNaN(price) || price <= 0) {
      return createErrorResponse('Price must be a valid positive number', 400);
    }

    const stock = body.stock ? parseInt(body.stock) : 0;
    if (isNaN(stock) || stock < 0) {
      return createErrorResponse('Stock must be a valid non-negative number', 400);
    }

    // Validate images array if provided
    const images = body.images || [];
    if (images.length > 0) {
      for (const imageUrl of images) {
        if (!imageUrl.startsWith('https://')) {
          return createErrorResponse('All images must be valid HTTPS URLs', 400);
        }
      }
    }

    // Prepare product data
    const productData = {
      name: body.title, // Map title to name for database
      description: body.description,
      price: price,
      stock: stock,
      category: body.category,
      subcategory: body.subcategory || '',
      condition: body.condition || 'good',
      images: images, // Array of image URLs
      sellerId: userId,
      userId: userId,
      sellerEmail: userEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active'
    };
    
    // Create the product
    const productModel = new ProductModel();
    const product = await productModel.create(productData);

    // Return success response
    return createSuccessResponse({
      success: true,
      message: 'Product created successfully',
      product
    }, 201);

  } catch (error) {
    console.error('Create product error:', error);
    return createErrorResponse('Error creating product: ' + error.message, 500);
  }
};
