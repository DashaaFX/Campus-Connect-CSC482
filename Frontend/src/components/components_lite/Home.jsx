// src/components/components_lite/Home.jsx
import React, { useEffect, useState } from 'react';
import Header from './Header';
import Footer from './Footer';
import axios from 'axios';
import { PRODUCT_API_ENDPOINT } from '@/utils/data';
import LatestProducts from './LatestProducts';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const Home = () => {
  const [recentProducts, setRecentProducts] = useState([]);

  useEffect(() => {
    axios
      .get(`${PRODUCT_API_ENDPOINT}?limit=6&sort=-createdAt`)
      .then(res => {
        setRecentProducts(res.data.products || []);
      })
      .catch(err => console.error('Failed to load products', err));
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      
      <Header />

      <main className="flex-grow px-4 py-12 bg-gray-50">
        <div className="container mx-auto">
          <h2 className="mb-8 text-3xl font-bold text-center">Latest Products</h2>
          <div className="text-center">
            <p>TEST: If you see this, React is working!</p>
            <p>Products found: {recentProducts.length}</p>
          </div>
          <LatestProducts limit={6} />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Home;

