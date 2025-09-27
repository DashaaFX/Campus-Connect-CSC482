
// Handles profile picture uploads to backend - AWS S3
// and updates user profile picture URL in auth store
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import ImageUploader from '@/components/ui/ImageUploader';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import axios from '@/utils/axios';
import { USER_API_ENDPOINT } from '@/utils/data';
import { getProfileImageUrl } from '@/utils/imageHelpers';

const ProfilePictureManager = () => {
  const { user, token } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);

  // Get current profile picture URL if available
  const currentPicture = user?.profilePicture || user?.profile?.profilePhoto || null;
  
  // Get user's initials for avatar fallback
  const getUserInitials = () => {
    if (!user || !user.fullname) return 'U';
    
    const nameParts = user.fullname.split(' ');
    if (nameParts.length > 1) {
      return `${nameParts[0][0]}${nameParts[1][0]}`;
    }
    return nameParts[0][0];
  };

  const handleProfilePictureUpdate = async (imageUrl) => {
    if (!imageUrl) {
      toast.error('No image selected');
      return;
    }

    try {
      // Store the S3 URL for backend (still upload to S3, just serve via CloudFront)
      const profilePictureUrl = imageUrl.startsWith('http') ? 
        imageUrl : 
        `https://campus-connect-uploads-${import.meta.env.VITE_ENVIRONMENT || 'local'}.s3.${import.meta.env.VITE_AWS_REGION || 'us-east-1'}.amazonaws.com/${imageUrl}`;
      
      // Update the user's profile picture in the backend
      const response = await axios.put(`${USER_API_ENDPOINT}/profile/picture`, {
        profilePicture: profilePictureUrl
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Directly update the auth store with the updated user object
      if (response.data.user) {
        useAuthStore.getState().setUser(response.data.user);
      } else {
        // Fallback to fetching user data
        await useAuthStore.getState().fetchUser();
      }
      
      toast.success('Profile picture updated successfully');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update profile picture');
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-medium">Profile Picture</h3>
        
        {!isEditing && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            Change
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <ImageUploader 
            onUploadComplete={handleProfilePictureUpdate}
            uploadType="profile"
            currentImage={currentPicture}
          />
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsEditing(false)}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-2">
          <Avatar className="w-20 h-20">
            <AvatarImage 
              src={getProfileImageUrl(currentPicture)} 
              alt={user?.fullname || 'Profile picture'} 
              className="object-cover"
            />
            <AvatarFallback className="text-lg font-medium">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-gray-600">
            {currentPicture ? 'Profile picture set' : 'No profile picture yet'}
          </span>
        </div>
      )}
    </div>
  );
};

export default ProfilePictureManager;

