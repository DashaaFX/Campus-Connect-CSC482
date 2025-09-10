import React from "react";
import ImageUploader from "../ui/ImageUploader";
import { useAuthStore } from "@/store/useAuthStore";
import axios from "../../utils/axios";
import { USER_API_ENDPOINT } from "../../utils/data";
import { toast } from "sonner";

// Simple wrapper for ImageUploader that handles profile picture uploads
const ProfilePicture = () => {
  const { user, token } = useAuthStore();
  
  const handleUploadComplete = async (fileUrl) => {
    if (fileUrl && token) {
      try {
        // Update the user's profile picture in the database
        await axios.put(`${USER_API_ENDPOINT}/profile/picture`, {
          profilePicture: fileUrl
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Update local state by refreshing user data
        useAuthStore.getState().fetchUser();
        
        toast.success("Profile picture updated successfully!");
      } catch (error) {
        console.error('Error updating profile picture:', error);
        toast.error("Failed to update profile picture");
      }
    }
  };
  
  return (
    <ImageUploader
      onUploadComplete={handleUploadComplete}
      uploadType="profile"
      currentImage={user?.profilePicture || user?.profile?.profilePhoto}
      requireAuth={true}
    />
  );
};

export default ProfilePicture;

