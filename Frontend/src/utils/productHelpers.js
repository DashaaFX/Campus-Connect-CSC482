/**
 * Utility functions for product handling
 */
/**
 * Extracts a consistent ID from product object regardless of ID format
 * @param {Object} product - The product object
 * @returns {string} The product ID
 */
export const getProductId = (product) => {
  if (!product) return null;
  
  // Try all possible ID formats
  return product.id || product._id || (product.productId ? product.productId : null);
};

/**
 * Gets a consistent product title from various possible field names
 * @param {Object} product - The product object
 * @returns {string} The product title
 */
export const getProductTitle = (product) => {
  if (!product) return 'Product';
  
  return product.title || product.name || 'Unnamed Product';
};

/**
 * Gets a consistent price from product object
 * @param {Object} product - The product object
 * @param {number} fallback - Optional fallback price
 * @returns {number} The product price as a number
 */
export const getProductPrice = (product, fallback = 0) => {
  if (!product) return fallback;
  
  const price = product.price || fallback;
  return parseFloat(price);
};

/**
 * Gets placeholder image URL that's guaranteed to exist
 * @returns {string} URL to the placeholder image
 */
export const getPlaceholderImage = () => {
  return '/placeholder-image.svg';
};

/**
 * Gets the first image URL from a product
 * @param {Object} product - The product object
 * @returns {string} The image URL or placeholder
 */
export const getProductImageUrl = (product) => {
  if (!product || !product.images || !product.images.length) {
    console.log('No images available for product:', product?.title || 'unknown');
    return getPlaceholderImage();
  }
  
  const image = product.images[0];
  if (!image) return getPlaceholderImage();
  
  // Handle absolute vs relative paths
  if (typeof image === 'string' && (image.startsWith('http') || image.startsWith('https'))) {
    return image;
  }
  
  // If it's not an http URL but starts with a slash, it might be a relative path
  if (typeof image === 'string' && image.startsWith('/')) {
    const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    const fullUrl = `${BASE_URL}${image}`;
    return fullUrl;
  }
  
  // Handle S3 paths
  const region = import.meta.env.VITE_AWS_REGION || 'us-east-1';
  const environment = import.meta.env.VITE_ENVIRONMENT || 'dev';
  
  // Construct the full S3 URL
  const bucketUrl = `https://campus-connect-uploads-${environment}.s3.${region}.amazonaws.com/`;
  let fullUrl;
  
  // Check if the image path contains a folder structure
  if (typeof image === 'string' && (image.includes('products/') || image.includes('profiles/'))) {
    fullUrl = bucketUrl + image;
  } else {
    // Use a default path structure with the image as the filename
    fullUrl = bucketUrl + 'products/anonymous-user/' + image;
  }
  
  console.log(`Generated image URL: ${fullUrl} for product ${product?.title || 'unknown'}`);
  return fullUrl;
};

/**
 * Processes a cart item to ensure it has complete product data
 * @param {Object} item - The cart item object
 * @returns {Object} The processed cart item
 */
export const processCartItem = (item) => {
  if (!item) return null;
  
  // Ensure we have a product object
  if (!item.product) {
    item.product = {
      id: item.productId,
      title: 'Loading product...',
      price: parseFloat(item.price || 0),
      images: []
    };
  }
  
  // Make a deep copy to avoid mutating the original
  const product = JSON.parse(JSON.stringify(item.product));
  
  // Ensure product has required fields
  product.id = getProductId(product) || item.productId;
  product.title = getProductTitle(product);
  product.price = getProductPrice(product, item.price || 0);
  
  // Make sure images array exists
  if (!product.images || !Array.isArray(product.images)) {
    product.images = [];
  }
  
  // Process images if they exist
  if (product.images && product.images.length > 0) {
    const imageUrl = getProductImageUrl({...product});
    console.log(`Processed image URL: ${imageUrl} for product ${product.title}`);
    product.images = [imageUrl]; // Store the full URL directly
  } else {
    console.log(`No images found for product ${product.title}`);
    // Add a placeholder image directly in the array
    product.images = [getPlaceholderImage()];
  }
  
  return {
    ...item,
    productId: item.productId || product.id,
    quantity: parseInt(item.quantity || 1),
    product
  };
};
