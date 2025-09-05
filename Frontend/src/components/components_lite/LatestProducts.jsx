import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { PRODUCT_API_ENDPOINT } from '@/utils/data';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { useDispatch } from 'react-redux';
import { addToCart, fetchCart } from '@/redux/cartSlice';
import { toast } from 'sonner';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const LatestProducts = ({ limit = 6 }) => {
  const [products, setProducts] = useState([]);
  const dispatch = useDispatch();

  useEffect(() => {
    axios
      .get(`${PRODUCT_API_ENDPOINT}?limit=${limit}&sort=-createdAt`)
      .then(res => setProducts(res.data.products || []))
      .catch(err => console.error('Failed to load products', err));
  }, [limit]);

  const handleAddToCart = (productId) => {
    dispatch(addToCart({ productId, quantity: 1 }))
      .unwrap()
      .then(() => {
        dispatch(fetchCart());
        toast.success("Added to cart");
      })
      .catch(() => toast.error("Failed to add to cart"));
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {products.map(product => (
        <div
          key={product._id}
          className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-4 flex flex-col"
        >
          <Link to={`/products/${product._id}`}>
            {product.images?.length > 0 ? (
              <img
                src={
                  product.images[0].startsWith('http')
                    ? product.images[0]
                    : `${BASE_URL}${product.images[0]}`
                }
                alt={product.title}
                className="h-40 w-full object-cover rounded"
              />
            ) : product.pdf?.length > 0 ? (
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(product.pdf[0])}&embedded=true`}
                title="PDF Preview"
                className="h-40 w-full rounded border"
              />
            ) : (
              <img
                src="/placeholder-image.jpg"
                alt="No preview"
                className="h-40 w-full object-cover rounded"
              />
            )}

            <h3 className="mt-4 font-semibold text-lg">{product.title}</h3>

            {product.pdf?.length > 0 && (
              <span className="mt-1 inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                Digital PDF
              </span>
            )}

            <p className="text-sm text-gray-500 flex-grow mt-1">
              {product.description?.substring(0, 60)}...
            </p>
          </Link>

          <div className="mt-4 flex items-center justify-between">
            <span className="font-bold text-xl">${product.price.toFixed(2)}</span>
          </div>

          <div className="mt-3 flex gap-2">
            <Link to={`/products/${product._id}`}>
              <Button size="sm" variant="outline">View</Button>
            </Link>
            <Button size="sm" onClick={() => handleAddToCart(product._id)}>Add to Cart</Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LatestProducts;
