// src/components/components_lite/ProductList.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { addToCart, fetchCart } from '@/redux/cartSlice';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
// import AddToWishList from '../AddToWishList'; // Optional

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const ProductList = ({ products=[] }) => {
  const dispatch = useDispatch();

  const handleAddToCart = (product) => {
    if (product.stock < 1) {
      toast.error('Out of stock');
      return;
    }
  
    dispatch(addToCart({ productId: product._id, quantity: 1 }))
      .unwrap()
      .then(() => {
        dispatch(fetchCart()); // 🔁 Update Redux state immediately
        toast.success(`${product.title} added to cart`);
      })
      .catch(() => toast.error('Failed to add to cart'));
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {products.map((product) => (
        <div
          key={product._id}
          className="bg-white shadow-md rounded-lg p-4 flex flex-col justify-between transition hover:shadow-xl"
        >
          <div className="relative">
            {/* Optional Wishlist */}
            {/* <div className="absolute top-2 right-2 z-10">
              <AddToWishList
                id={product._id}
                liked={product?.isLiked}
                updateWishlist={updateWishlist}
                authenticated={authenticated}
              />
            </div> */}

            <Link to={`/products/${product._id}`}>
              <img
                src={
                  product.images?.[0]
                    ? `${BASE_URL}${product.images[0]}`
                    : '/placeholder-image.jpg'
                }
                alt={product.title}
                className="w-full h-48 object-cover rounded-md"
              />
            </Link>
          </div>

          <div className="flex flex-col justify-between flex-1 mt-4">
            <div>
              <Link to={`/products/${product._id}`}>
                <h2 className="text-lg font-semibold mb-1">{product.title}</h2>
              </Link>
              <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
              <p className="text-red-600 text-lg font-bold mt-2">${product.price.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Stock: {product.stock}</p>
            </div>

            <div className="mt-4 flex gap-2">
              <Link to={`/products/${product._id}`} className="w-full">
                <Button variant="outline" className="w-full">View</Button>
              </Link>
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
