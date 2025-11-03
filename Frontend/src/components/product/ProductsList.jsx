// Products list that will be passed onto PublicProducts page.
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useCartStore } from '@/store/useCartStore'; 
import { getProductId, getProductTitle, getProductPrice, getProductImageUrl, getPlaceholderImage } from '@/utils/productHelpers';

const ProductList = ({ products = [] }) => {  
  const [previewPdf, setPreviewPdf] = useState(null);
  const addToCart = useCartStore(state => state.addToCart);

  const handleAddToCart = async (product) => {
    if (product.stock < 1) {
      toast.error('Out of stock');  
      return;
    }

    try {
      const productId = getProductId(product);
      if (!productId) {
        throw new Error('Invalid product ID');
      }
      
      await addToCart({ productId, quantity: 1 });
      toast.success(`${getProductTitle(product)} added to cart`);
    } catch (err) {
      toast.error(err.message || 'Failed to add to cart');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
    {/* Filter out inactive/ deleted products */}
    {products.filter(p => p.status !== 'inactive' && p.status !== 'deleted').map((product) => (
        <div
          key={product.id || product._id}
          className="flex flex-col justify-between p-4 transition bg-white rounded-lg shadow-md hover:shadow-xl"
        >
          <div className="relative">
            <Link to={`/products/${getProductId(product)}`}>
              {product.isDigital ? (
                <div className="relative flex items-center justify-center w-full h-48 overflow-hidden rounded-md bg-gray-50">
                  <img
                    src={product.previewImage || getPlaceholderImage()}
                    alt={getProductTitle(product)}
                    className="object-contain w-full h-full p-2"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = getPlaceholderImage();
                    }}
                  />
                  <span className="absolute top-2 left-2 px-2 py-0.5 text-xs font-semibold bg-blue-600 text-white rounded shadow">DIGITAL</span>
                </div>
              ) : (
                <img
                  src={getProductImageUrl(product) || getPlaceholderImage()}
                  alt={getProductTitle(product)}
                  className="object-cover w-full h-48 rounded-md"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = getPlaceholderImage();
                  }}
                />
              )}
            </Link>
          </div>

          <div className="flex flex-col justify-between flex-1 mt-4">
            <div>
              <Link to={`/products/${product.id || product._id}`}>
                <h2 className="mb-1 text-lg font-semibold">{product.title}</h2>
              </Link>

              {product.isDigital && (
                <span className="inline-block mt-1 mb-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                  {product.digitalFormat ? product.digitalFormat.toUpperCase() : 'DIGITAL'}
                </span>
              )}

              <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
              <p className="mt-2 text-lg font-bold text-red-600">${Number(product.price || 0).toFixed(2)}</p>
              <p className="text-xs text-gray-500">Stock: {product.stock}</p>
            </div>

            <div className="flex flex-col gap-2 mt-4">
              <Link to={`/products/${product.id || product._id}`} className="w-full">
                <Button variant="outline" className="w-full">View</Button>
              </Link>

              {product.isDigital && (
                <Button variant="outline" className="w-full" disabled>
                  Preview Limited (Purchase to Unlock)
                </Button>
              )}

              <Button
                onClick={() => handleAddToCart(product)}
                disabled={product.stock < 1}
                className="w-full"
              >
                {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductList;

