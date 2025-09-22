import React, { useState, useEffect } from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Upload, X, Plus } from "lucide-react";
import axios from "../../utils/axios";
import { UPLOAD_API_ENDPOINT } from "../../utils/data";
import { useAuthStore } from "../../store/useAuthStore";

const MultiImageUploader = ({ onUploadComplete, uploadType = "product", currentImages = [] }) => {
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState(currentImages);
  const [error, setError] = useState("");
  const { user, token } = useAuthStore();

  const handleFileUpload = async (file) => {
    if (!file) return;

    // Check if user is logged in
    if (!user || !token) {
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
      // Get presigned URL with authentication
      const token = useAuthStore.getState().token;
      const uploadResponse = await axios.post(`${UPLOAD_API_ENDPOINT}/url`, {
        fileName: file.name,
        fileType: file.type,
        uploadType: uploadType
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      const { uploadUrl, fileUrl } = uploadResponse.data;

      // Upload file to S3
      await axios.put(uploadUrl, file, {
        headers: {
          'Content-Type': file.type,
          // Don't send Authorization header for S3 upload
        },
        withCredentials: false,
      });

      const newImages = [...images, fileUrl];
      setImages(newImages);
      onUploadComplete(newImages);
      
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
    e.target.value = '';
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    onUploadComplete(newImages);
  };

  return (
    <div className="space-y-3">
      <Label>Product Images</Label>
      
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {/* Display uploaded images */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {images.map((imageUrl, index) => (
            <div key={index} className="relative group">
              <img 
                src={imageUrl} 
                alt={`Product ${index + 1}`} 
                className="object-cover w-full h-24 border rounded-lg"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute p-1 text-white transition-opacity bg-red-500 rounded-full opacity-0 -top-2 -right-2 hover:bg-red-600 group-hover:opacity-100"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new image button */}
      <div className="p-4 text-center border-2 border-gray-300 border-dashed rounded-lg">
        <div className="flex flex-col items-center space-y-2">
          <Plus className="w-8 h-8 text-gray-400" />
          <p className="text-gray-500">Add Product Image</p>
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="w-full cursor-pointer"
          />
          {uploading && (
            <p className="text-blue-500">Uploading...</p>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Supported formats: JPEG, PNG, GIF, WebP. Max size: 5MB per image.
      </p>
    </div>
  );
};

export default MultiImageUploader;

