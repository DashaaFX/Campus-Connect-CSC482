//Built with Copilot, used to upload profile and product images.
import React, { useState } from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Upload, X } from "lucide-react";
import api from "@/utils/axios";
import { UPLOAD_API_ENDPOINT } from "../../utils/data";
import { useAuthStore } from "../../store/useAuthStore";

const ImageUploader = ({ onUploadComplete, uploadType = "profile", currentImage = null, requireAuth = true }) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentImage);
  const [error, setError] = useState("");
  const { user, token } = useAuthStore();

  const handleFileUpload = async (file) => {
    if (!file) return;

    // Check if user is logged in (only if auth is required)
    if (requireAuth && (!user || !token)) {
      setError("Please log in to upload images");
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError("Please select a valid image file (JPEG, PNG, GIF, WebP)");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    setUploading(true);
    setError("");

    try {
      if (requireAuth) {
        // Use presigned URL for authenticated uploads
        const uploadResponse = await api.post(`${UPLOAD_API_ENDPOINT}/url`, {
          fileName: file.name,
          fileType: file.type,
          uploadType: uploadType, // Explicitly using the passed uploadType
          userId: user?.id || user?._id || 'anonymous-user'
        }, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        const { uploadUrl, fileUrl } = uploadResponse.data;

        // Upload file to S3
        await api.put(uploadUrl, file, {
          headers: {
            'Content-Type': file.type,
          },
        });

        setPreviewUrl(fileUrl);
        onUploadComplete(fileUrl);
      } else {
        // For registration, just create a local preview
        // The actual upload will happen after successful registration
        const localUrl = URL.createObjectURL(file);
        setPreviewUrl(localUrl);
        onUploadComplete(file); // Pass the file object for later upload
      }
      
    } catch (err) {
      console.error('Upload error:', err);
      if (err.response?.status === 401) {
        setError('Authentication required. Please log in again.');
      } else {
        setError(err.response?.data?.message || 'Upload failed');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const removeImage = () => {
    setPreviewUrl(null);
    onUploadComplete(null);
  };

  return (
    <div className="space-y-3">
      <Label>
        {uploadType === 'profile' ? 'Profile Picture' : 'Upload Images'}
      </Label>
      
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {previewUrl ? (
        <div className="relative inline-block">
          <img 
            src={previewUrl} 
            alt="Preview" 
            className="object-cover w-32 h-32 border rounded-lg"
          />
          <button
            type="button"
            onClick={removeImage}
            className="absolute p-1 text-white bg-red-500 rounded-full -top-2 -right-2 hover:bg-red-600"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="p-6 text-center border-2 border-gray-300 border-dashed rounded-lg">
          <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="mb-3 text-gray-500">
            {uploadType === 'profile' ? 'Upload your profile picture' : 'Upload product images'}
          </p>
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="cursor-pointer"
          />
          {uploading && (
            <p className="mt-2 text-blue-500">Uploading...</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;

