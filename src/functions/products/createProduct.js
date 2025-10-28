import { ProductModel } from '/opt/nodejs/models/Product.js';
import { createSuccessResponse, createErrorResponse, parseJSONBody, validateRequiredFields } from '/opt/nodejs/utils/response.js';
import { getFormatPlaceholder } from '/opt/nodejs/utils/digitalConstants.js';

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

    // Digital product Phase 1 support
    const isDigital = !!body.documentKey; 
    const allowedDigitalFormats = ['pdf', 'doc', 'docx'];
    let digitalFormat = null;
    if (isDigital) {
      // Enforce that the provided documentKey is already a PRIVATE object path
      if (!body.documentKey.startsWith('private/')) {
        return createErrorResponse('Digital documentKey must start with "private/". Upload the file with access="private" and use the returned key.', 400);
      }
      // Accept explicit digitalFormat or derive from documentKey
      digitalFormat = (body.digitalFormat || body.documentFormat || '').toLowerCase();
      if (!digitalFormat && body.documentKey) {
        const ext = body.documentKey.split('.').pop().toLowerCase();
        if (allowedDigitalFormats.includes(ext)) digitalFormat = ext;
      }
      if (!allowedDigitalFormats.includes(digitalFormat)) {
        return createErrorResponse(`Invalid digital format. Allowed: ${allowedDigitalFormats.join(', ')}`, 400);
      }
    }

    // If digital, we can tolerate empty images (preview may come later)
  const previewImage = isDigital ? (body.previewImage || body.preview || null) : null;
    const fileSizeBytes = isDigital && body.fileSizeBytes ? parseInt(body.fileSizeBytes) : null;
    if (isDigital && fileSizeBytes && (isNaN(fileSizeBytes) || fileSizeBytes < 0)) {
      return createErrorResponse('fileSizeBytes must be a positive integer', 400);
    }

    // Prepare product data (shared + digital optional fields)
    const productData = {
      name: body.title, // Map title to name for database
      description: body.description,
      price: price,
      stock: isDigital ? 1 : stock,
      category: body.category,
      subcategory: body.subcategory || '',
      condition: body.condition || 'good',
      images: images, // Array of image URLs
      sellerId: userId,
      userId: userId,
      sellerEmail: userEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      // Digital metadata
      isDigital,
      digitalFormat: isDigital ? digitalFormat : null,
  documentKey: isDigital ? body.documentKey : null, // already validated to include private/
      documentOriginalName: isDigital ? (body.documentOriginalName || body.originalName || body.title) : null,
  previewImage: isDigital ? (previewImage || getFormatPlaceholder(digitalFormat)) : null,
  digitalStatus: isDigital ? ((previewImage || getFormatPlaceholder(digitalFormat)) ? 'ready' : 'processing') : null,
  fileSizeBytes: isDigital ? fileSizeBytes : null,
  digitalAutoComplete: isDigital ? !!body.digitalAutoComplete : false
    };
    // Initialize digital download count
    if (isDigital) {
      productData.digitalDownloadCount = 0;
    }
    
    // Create the product
    const productModel = new ProductModel();
    const product = await productModel.create(productData);

    // Sanitize response: hide raw documentKey until secure download implemented
    if (product.isDigital) {
      // Keep internal key but do not expose in API response (client only needs to know it's digital + preview)
      delete product.documentKey;
    }

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
