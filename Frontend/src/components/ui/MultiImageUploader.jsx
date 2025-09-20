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

  // User authentication check
    if (!user || !token) {
      setError("Please log in to upload images");
      return;
    }

  // File type validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError("Please select a valid image file (JPEG, PNG, GIF, WebP)");
      return;
    }

  // File size validation (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    setUploading(true);
    setError("");

    try {
  // Get presigned URL
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
          // S3 upload does not require Authorization header
        },
        withCredentials: false,
      });

      const newImages = [...images, fileUrl];
      setImages(newImages);
      onUploadComplete(newImages);
      
    } catch (err) {
  // Upload error - handled by error state
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
                className="w-full h-24 object-cover rounded-lg border"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new image button */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
        <div className="flex flex-col items-center space-y-2">
          <Plus className="h-8 w-8 text-gray-400" />
          <p className="text-gray-500">Add Product Image</p>
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="cursor-pointer w-full"
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

