import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useCartStore } from '@/store/useCartStore'; 

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5011';

const ProductList = ({ products = [] }) => {  
  const [previewPdf, setPreviewPdf] = useState(null);
  const addToCart = useCartStore(state => state.addToCart);

  const handleAddToCart = async (product) => {
    if (product.stock < 1) {
      toast.error('Out of stock');  
      return;
    }

    try {
      await addToCart({ productId: product._id, quantity: 1 });
      toast.success(`${product.title} added to cart`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to add to cart');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
      {products.map((product) => (
        <div
          key={product._id}
          className="flex flex-col justify-between p-4 transition bg-white rounded-lg shadow-md hover:shadow-xl"
        >
          <div className="relative">
            <Link to={`/products/${product._id}`}>
              {product.images?.length > 0 ? (
                <img
                  src={
                    product.images[0].startsWith('http')
                      ? product.images[0]
                      : `${BASE_URL}${product.images[0]}`
                  }
                  alt={product.title}
                  className="object-cover w-full h-48 rounded-md"
                />
              ) : product.pdf?.length > 0 ? (
                <iframe
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(
                    product.pdf[0]
                  )}&embedded=true`}
                  title="PDF Preview"
                  className="w-full h-48 border rounded-md"
                />
              ) : (
                <img
                  src="/placeholder-image.jpg"
                  alt="placeholder"
                  className="object-cover w-full h-48 rounded-md"
                />
              )}
            </Link>
          </div>

          <div className="flex flex-col justify-between flex-1 mt-4">
            <div>
              <Link to={`/products/${product._id}`}>
                <h2 className="mb-1 text-lg font-semibold">{product.title}</h2>
              </Link>

              {product.pdf?.length > 0 && (
                <span className="inline-block mt-1 mb-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                  Digital PDF
                </span>
              )}

              <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
              <p className="mt-2 text-lg font-bold text-red-600">${product.price.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Stock: {product.stock}</p>
            </div>

            <div className="flex flex-col gap-2 mt-4">
              <Link to={`/products/${product._id}`} className="w-full">
                <Button variant="outline" className="w-full">View</Button>
              </Link>

              {product.pdf?.length > 0 && (
                <Dialog onOpenChange={(open) => !open && setPreviewPdf(null)}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setPreviewPdf(product.pdf[0])}
                    >
                      Preview PDF
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-full max-w-4xl h-[80vh] overflow-hidden">
                    <iframe
                      src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewPdf)}&embedded=true`}
                      title="PDF Preview"
                      width="100%"
                      height="100%"
                      className="border rounded"
                    />
                  </DialogContent>
                </Dialog>
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
