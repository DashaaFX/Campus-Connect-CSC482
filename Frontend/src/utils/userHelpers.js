// src/utils/userHelpers.js
import { getPlaceholderImage } from './productHelpers';
import { getCloudFrontImageUrl } from './imageHelpers.js';

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
  
  // Use the centralized URL generation function
  // This will automatically use CloudFront if available, otherwise S3
  if (typeof profilePicture === 'string') {
    return getCloudFrontImageUrl(profilePicture);
  }
  
  return getPlaceholderImage();
};

/**
 * Gets placeholder profile image URL
 * @returns {string} URL to the placeholder profile image
 */
export const getPlaceholderProfileImage = () => {
  return getPlaceholderImage();
};

