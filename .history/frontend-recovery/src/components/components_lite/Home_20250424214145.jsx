// src/components/components_lite/Home.jsx
import React, { useEffect, useState } from 'react';
import Navbar from './Navbar';
import Header from './Header';
import Footer from './Footer';
import axios from 'axios';
import { PRODUCT_API_ENDPOINT } from '@/utils/data';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const Home = () => {
  const [recentProducts, setRecentProducts] = useState([]);

  useEffect(() => {
    axios
      .get(`${PRODUCT_API_ENDPOINT}?limit=6&sort=-createdAt`)
      .then(res => {
        setRecentProducts(res.data.data || res.data);
      })
      .catch(err => console.error('Failed to load products', err));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <Header />

      <main className="flex-grow bg-gray-50 py-12 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Latest Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {recentProducts.map(product => (
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
                  <Button size="sm">View</Button>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
