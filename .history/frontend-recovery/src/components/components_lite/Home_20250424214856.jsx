// src/components/components_lite/Home.jsx
import React, { useEffect, useState } from 'react';
import Navbar from './Navbar';
import Header from './Header';
import Footer from './Footer';
import axios from 'axios';
import { PRODUCT_API_ENDPOINT } from '@/utils/data';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import LatestProducts from './LatestProducts';

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
        <LatestProducts limit={6} />
      </div>
    </main>

      <Footer />
    </div>
  );
};

export default Home;
