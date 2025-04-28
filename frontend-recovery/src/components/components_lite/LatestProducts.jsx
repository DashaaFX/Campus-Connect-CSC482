// src/components/components_lite/LatestProducts.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { PRODUCT_API_ENDPOINT } from '@/utils/data';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { useDispatch } from 'react-redux';
import { addToCart } from '@/redux/cartSlice';
import { toast } from 'sonner';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const LatestProducts = ({ limit = 6 }) => {
  const [products, setProducts] = useState([]);
  const dispatch = useDispatch();

  useEffect(() => {
    axios
      .get(`${PRODUCT_API_ENDPOINT}?limit=${limit}&sort=-createdAt`)
      .then(res => setProducts(res.data.data || res.data))
      .catch(err => console.error('Failed to load products', err));
  }, [limit]);

  const handleAddToCart = (productId) => {
    dispatch(addToCart({ productId, quantity: 1 }))
      .unwrap()
      .then(() => toast.success('Added to cart'))
      .catch((err) => toast.error(err));
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {products.map(product => (
        <div
          key={product._id}
          className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-4 flex flex-col"
        >
          <Link to={`/products/${product._id}`}>
            <img
              src={
                product.images?.[0]
                  ? `${BASE_URL}${product.images[0]}`
                  : '/placeholder-image.jpg'
              }
              alt={product.title}
              className="h-40 w-full object-cover rounded"
            />
            <h3 className="mt-4 font-semibold text-lg">{product.title}</h3>
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
