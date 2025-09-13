
export const getCloudFrontImageUrl = (imageUrl) => {
  if (!imageUrl) return '/placeholder-image.jpg';

  if (imageUrl.startsWith('http')) {
    if (imageUrl.includes('.s3.') || imageUrl.includes('amazonaws.com')) {
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      return `https://${import.meta.env.VITE_CLOUDFRONT_DOMAIN}/${fileName}`;
    }

    return imageUrl;
  }
  
  const cleanPath = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
  return `https://${import.meta.env.VITE_CLOUDFRONT_DOMAIN}/${cleanPath}`;
};


export const getProductImageUrl = (images, index = 0) => {
  if (!images) return '/placeholder-image.jpg';
  
  if (Array.isArray(images)) {
    const image = images[index];
    return getCloudFrontImageUrl(image);
  }
  
  return getCloudFrontImageUrl(images);
};

export const getProfileImageUrl = (profilePicture) => {
  return getCloudFrontImageUrl(profilePicture);
};