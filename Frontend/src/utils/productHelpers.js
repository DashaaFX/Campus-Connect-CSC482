//product handling
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
      images: []
    };
  }
  const product = JSON.parse(JSON.stringify(item.product));
  
  // Ensure product has required fields
  product.id = getProductId(product) || item.productId;
  product.title = getProductTitle(product);
  product.price = getProductPrice(product, item.price || 0);
  
  if (!product.images || !Array.isArray(product.images)) {
    product.images = [];
  }
  
  if (product.images && product.images.length > 0) {
    const imageUrl = getProductImageUrl({...product});
    product.images = [imageUrl]; 
  } else {
    product.images = [getPlaceholderImage()];
  }
  
  return {
    ...item,
    productId: item.productId || product.id,
    quantity: parseInt(item.quantity || 1),
    product
  };
};

// Determine if a user owns a digital product given their orders list, any COMPLETED order that includes the product as an item.
export const userOwnsDigitalProduct = (orders, userId, productId) => {
  if (!orders || !Array.isArray(orders) || !productId) return false;
  return orders.some(o => o && o.status === 'completed' && Array.isArray(o.items) && o.items.some(it => {
    const pid = it.productId || it.product?.id || it.product?._id;
    return pid === productId;
  }));
};


