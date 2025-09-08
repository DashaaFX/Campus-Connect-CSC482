import React, { useState } from 'react';
import { getPlaceholderImage } from '@/utils/productHelpers';

/**
 * Debug component to help troubleshoot image loading issues
 */
const ImageDebugger = ({ product }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  if (!product) return null;
  
  // Extract relevant information
  const productId = product.id || product._id;
  const images = product.images || [];
  
  return (
    <div className="relative my-2">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-1 text-xs text-gray-500 bg-gray-100 rounded hover:bg-gray-200"
      >
        {isOpen ? 'Hide' : 'Debug'} Image Info
      </button>
      
      {isOpen && (
        <div className="p-4 mt-2 text-xs text-left bg-gray-100 rounded">
          <h4 className="font-bold">Image Debug Information</h4>
          <p><strong>Product ID:</strong> {productId}</p>
          <p><strong>Image Count:</strong> {images.length}</p>
          
          {images.map((img, index) => (
            <div key={index} className="mt-2 border-t border-gray-300 pt-2">
              <p><strong>Image {index + 1}:</strong></p>
              <p className="break-all"><code>{JSON.stringify(img)}</code></p>
              <p className="mt-1"><strong>Is String:</strong> {typeof img === 'string' ? 'Yes' : 'No'}</p>
              <p><strong>Starts with HTTP:</strong> {typeof img === 'string' && img.startsWith('http') ? 'Yes' : 'No'}</p>
              
              <div className="mt-2">
                <p><strong>Test rendering:</strong></p>
                <img 
                  src={img} 
                  alt={`Debug ${index}`} 
                  className="h-10 mt-1 border border-red-300" 
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = getPlaceholderImage();
                    e.target.className += ' border-2 border-red-500';
                    e.target.title = 'Failed to load';
                  }}
                />
              </div>
            </div>
          ))}
          
          <div className="mt-4 pt-2 border-t border-gray-300">
            <p><strong>Environment Variables:</strong></p>
            <p><strong>VITE_API_BASE_URL:</strong> {import.meta.env.VITE_API_BASE_URL || 'Not set'}</p>
            <p><strong>VITE_ENVIRONMENT:</strong> {import.meta.env.VITE_ENVIRONMENT || 'Not set (defaulting to dev)'}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageDebugger;
