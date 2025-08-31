import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { addToCart, fetchCart } from '@/redux/cartSlice';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const ProductList = ({ products = [] }) => {
  const dispatch = useDispatch();
  const [previewPdf, setPreviewPdf] = useState(null);

  const handleAddToCart = (product) => {
    if (product.stock < 1) {
      toast.error('Out of stock');
      return;
    }

    dispatch(addToCart({ productId: product._id, quantity: 1 }))
      .unwrap()
      .then(() => {
        dispatch(fetchCart());
        toast.success(`${product.title} added to cart`);
      })
      .catch(() => toast.error('Failed to add to cart'));
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {products.map((product) => (
          <div
            key={product._id}
            className="bg-white shadow-md rounded-lg p-4 flex flex-col justify-between transition hover:shadow-xl"
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
                    className="w-full h-48 object-cover rounded-md"
                  />
                ) : product.pdf?.length > 0 ? (
                   <iframe
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(product.pdf[0])}&embedded=true`}
                    title="PDF Preview"
                    className="w-full h-48 rounded-md border"
                  />
                ) : (
                  <img
                    src="/placeholder-image.jpg"
                    alt="placeholder"
                    className="w-full h-48 object-cover rounded-md"
                  />
                )}
              </Link>
            </div>

            <div className="flex flex-col justify-between flex-1 mt-4">
              <div>
                <Link to={`/products/${product._id}`}>
                  <h2 className="text-lg font-semibold mb-1">{product.title}</h2>
                </Link>

                {product.pdf?.length > 0 && (
                  <span className="inline-block mt-1 mb-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                    Digital PDF
                  </span>
                )}

                <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                <p className="text-red-600 text-lg font-bold mt-2">${product.price.toFixed(2)}</p>
                <p className="text-xs text-gray-500">Stock: {product.stock}</p>
              </div>

              <div className="mt-4 flex flex-col gap-2">
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
                        className="rounded border"
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
    </>
  );
};

export default ProductList;
