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

// Derive a display name for chat window, 
export const getUserDisplayName = (user) => {
  if (!user) return '';
  const profile = user.profile || {};
  if (profile.displayName && typeof profile.displayName === 'string') return profile.displayName.trim();
  if (user.name && typeof user.name === 'string') return user.name.trim();
  const first = profile.firstName && typeof profile.firstName === 'string' ? profile.firstName.trim() : '';
  const last = profile.lastName && typeof profile.lastName === 'string' ? profile.lastName.trim() : '';
  const combined = `${first} ${last}`.trim();
  if (combined) return combined;
  if (user.email && typeof user.email === 'string') {
    const local = user.email.split('@')[0];
    if (local) return local;
  }
  return user.id || '';
};

