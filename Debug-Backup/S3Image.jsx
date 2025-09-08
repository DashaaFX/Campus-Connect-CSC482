import React, { useState, useEffect } from 'react';
import { getS3ImageUrl } from '@/utils/environment';

/**
 * Component that handles S3 image loading with proper error handling and debugging
 */
const S3Image = ({ src, alt, className, onLoadSuccess, onLoadError }) => {
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [debug, setDebug] = useState(false);
  
  useEffect(() => {
    if (!src) {
      setLoading(false);
      setError(true);
      if (onLoadError) onLoadError('No source provided');
      return;
    }
    
    try {
      // Try to convert the source to a proper S3 URL if needed
      const properUrl = src.startsWith('http') ? src : getS3ImageUrl(src);
      setImageUrl(properUrl);
      
      // Pre-load the image
      const img = new Image();
      img.onload = () => {
        setLoading(false);
        setError(false);
        if (onLoadSuccess) onLoadSuccess(properUrl);
      };
      img.onerror = (e) => {
        console.error('Failed to load image:', properUrl, e);
        setLoading(false);
        setError(true);
        if (onLoadError) onLoadError(e);
      };
      img.src = properUrl;
    } catch (err) {
      console.error('Error processing image URL:', err);
      setLoading(false);
      setError(true);
      if (onLoadError) onLoadError(err);
    }
  }, [src]);
  
  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div 
        className={`flex flex-col items-center justify-center bg-gray-100 ${className}`}
        onClick={() => setDebug(!debug)}
      >
        <div className="text-gray-500 text-sm">Image not available</div>
        {debug && (
          <div className="mt-2 p-2 bg-gray-200 text-xs overflow-auto max-w-full">
            <p>Failed URL: {imageUrl || 'none'}</p>
            <p>Original source: {src || 'none'}</p>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="relative">
      <img 
        src={imageUrl} 
        alt={alt || 'Product image'} 
        className={className}
        onError={(e) => {
          e.target.onerror = null; 
          setError(true);
        }}
      />
      {debug && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-1 text-xs">
          {imageUrl}
        </div>
      )}
    </div>
  );
};

export default S3Image;
