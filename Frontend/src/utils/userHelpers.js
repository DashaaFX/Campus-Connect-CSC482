// src/utils/userHelpers.js
import { getPlaceholderImage } from './productHelpers';
import { getCloudFrontImageUrl } from './imageHelpers.js';


export const getProfilePictureUrl = (user) => {
  if (!user) {
    return getPlaceholderProfileImage();
  }
  
  let profilePicture = user.profilePicture || user.profile?.profilePhoto || null;
  
  if (!profilePicture) {
    return getPlaceholderProfileImage();
  }

  if (typeof profilePicture === 'string') {
    return getCloudFrontImageUrl(profilePicture);
  }
  
  return getPlaceholderImage();
};

export const getPlaceholderProfileImage = () => {
  return getPlaceholderImage();
};

