// src/utils/userHelpers.js
import { getPlaceholderImage } from './productHelpers';

/**
 * Gets the appropriate URL for a user's profile picture
 * @param {Object} user - The user object
 * @returns {string} The profile picture URL or placeholder
 */
export const getProfilePictureUrl = (user) => {
  if (!user) {
    return getPlaceholderProfileImage();
  }
  
  // Get the profile picture from the appropriate location in the user object
  let profilePicture = user.profilePicture || user.profile?.profilePhoto || null;
  
  if (!profilePicture) {
    return getPlaceholderProfileImage();
  }
  
  // If the image is already a full URL (https://bucket-name.s3...), return it as is
  if (typeof profilePicture === 'string' && 
      ((profilePicture.startsWith('http') || profilePicture.startsWith('https')) && 
       profilePicture.includes('.s3.'))) {
    return profilePicture;
  }
  
  // Handle S3 paths
  const region = import.meta.env.VITE_AWS_REGION || 'us-east-1';
  const environment = import.meta.env.VITE_ENVIRONMENT || 'dev';
  
  // Construct the full S3 URL
  const bucketUrl = `https://campus-connect-uploads-${environment}.s3.${region}.amazonaws.com/`;
  
  // If profilePicture contains a path structure, use it directly
  if (typeof profilePicture === 'string' && profilePicture.includes('/')) {
    const finalUrl = bucketUrl + profilePicture;
    return finalUrl;
  } 
  
  // Otherwise, assume it's just a filename and add the profiles/ prefix
  const finalUrl = bucketUrl + 'profiles/' + user.id + '/' + profilePicture;
  return finalUrl;
};

/**
 * Gets placeholder profile image URL
 * @returns {string} URL to the placeholder profile image
 */
export const getPlaceholderProfileImage = () => {
  return getPlaceholderImage();
};

