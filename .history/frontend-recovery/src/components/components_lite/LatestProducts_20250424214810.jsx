// src/components/components_lite/LatestProducts.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { PRODUCT_API_ENDPOINT } from '@/utils/data';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const LatestProducts = ({ limit = 6 }) => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    axios
      .get(`${PRODUCT_API_ENDPOINT}?limit=${limit}&sort=-createdAt`)
      .then(res => setProducts(res.data.data || res.data))
      .catch(err => console.error('Failed to load products', err));
  }, [limit]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {products.map(product => (
        <Link
          key={product._id}
          to={`/products/${product._id}`}
          className="block bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-4 flex flex-col"
        >
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
          <div className="mt-4 flex items-center justify-between">
            <span className="font-bold text-xl">${product.price.toFixed(2)}</span>
            <Button size="sm">View</nButton>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default LatestProducts;