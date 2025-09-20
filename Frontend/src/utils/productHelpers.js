/**
 * Utility functions for product handling
 */
import { getCloudFrontImageUrl } from './imageHelpers.js';

export const getProductId = (product) => {
  if (!product) return null;
  
  // Try all possible ID formats
  return product.id || product._id || (product.productId ? product.productId : null);
};

export const getProductTitle = (product) => {
  if (!product) return 'Product';
  
  return product.title || product.name || 'Unnamed Product';
};
export const getProductPrice = (product, fallback = 0) => {
  if (!product) return fallback;
  
  const price = product.price || fallback;
  return parseFloat(price);
};


export const getPlaceholderImage = () => {
  return '/placeholder-image.svg';
};

export const getProductImageUrl = (product) => {
  if (!product || !product.images || !product.images.length) {
    return getPlaceholderImage();
  }
  
  const image = product.images[0];
  if (!image) return getPlaceholderImage();
  
  // Use CloudFront for all images
  return getCloudFrontImageUrl(image);
};


export const processCartItem = (item) => {
  if (!item) return null;
  
  // Ensure we have a product object
  if (!item.product) {
    item.product = {
      id: item.productId,
      title: 'Loading product...',
      price: parseFloat(item.price || 0),
      images: [],
      stock: 0
    };
  }
  
  // Make a deep copy to avoid mutating the original
  const product = JSON.parse(JSON.stringify(item.product));
  
  // Ensure product has required fields
  product.id = getProductId(product) || item.productId;
  product.title = getProductTitle(product);
  product.price = getProductPrice(product, item.price || 0);
  product.stock = typeof product.stock === 'number' ? product.stock : parseInt(product.stock || 0);
  
  // Make sure images array exists
  if (!product.images || !Array.isArray(product.images)) {
    product.images = [];
  }
  
  // Process images if they exist
  if (product.images && product.images.length > 0) {
    const imageUrl = getProductImageUrl({...product});
    product.images = [imageUrl]; // Store the full URL directly
  } else {
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

