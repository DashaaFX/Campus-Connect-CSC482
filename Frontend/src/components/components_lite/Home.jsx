import React, { useEffect, useState } from 'react';
import Header from './Header';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import Footer from './Footer';
import axios from 'axios';
import { PRODUCT_API_ENDPOINT } from '@/utils/data';
import LatestProducts from './LatestProducts';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const Home = () => {
  const [recentProducts, setRecentProducts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get(`${PRODUCT_API_ENDPOINT}?limit=6&sort=-createdAt`)
      .then(res => {
        setRecentProducts(res.data.data || res.data);
      })
      .catch(err => console.error('Failed to load products', err));
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <section className="relative flex flex-col items-center justify-center py-20 overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-gray-800 animate-fade-in">
        <div className="absolute inset-0 pointer-events-none">
          <svg className="w-full h-full opacity-10" viewBox="0 0 1440 320"><path fill="#fff" fillOpacity="0.2" d="M0,224L48,197.3C96,171,192,117,288,117.3C384,117,480,171,576,197.3C672,224,768,224,864,197.3C960,171,1056,117,1152,128C1248,139,1344,213,1392,250.7L1440,288L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path></svg>
        </div>
        <div className="relative z-10 flex flex-col items-center text-center animate-fade-in-up">
          <h1 className="mb-4 text-5xl font-extrabold leading-tight text-white drop-shadow-lg">Welcome to Campus Connect</h1>
          <p className="max-w-2xl mb-8 text-lg text-white/80">Buy, sell, and discover the best deals for students. Join our vibrant marketplace and start your journey today!</p>
          <Button
            size="lg"
            className="px-8 py-4 text-lg font-bold text-yellow-300 transition-all duration-200 border shadow-lg bg-white/10 hover:bg-yellow-300/20 hover:text-white border-yellow-300/30 animate-bounce hover:animate-none backdrop-blur"
            onClick={() => navigate('/products/create')}
          >
            Add New Product
          </Button>
        </div>
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20 mix-blend-soft-light" style={{backgroundImage: 'url(https://www.transparenttextures.com/patterns/diamond-upholstery.png)'}} />
      </section>

      <main className="flex-grow px-4 py-12 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 animate-fade-in-up">
        <div className="container mx-auto">
          <h2 className="mb-8 text-3xl font-bold text-center text-white drop-shadow">Latest Products</h2>
          <LatestProducts limit={6} />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Home;

