// src/components/components_lite/Header.jsx
import React, { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Search } from 'lucide-react';
import { PiBuildingOfficeBold } from 'react-icons/pi';
import axios from 'axios';
import { CATEGORY_API_ENDPOINT } from '@/utils/data';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get(CATEGORY_API_ENDPOINT)
      .then(res => setCategories(res.data))
      .catch(err => console.error('Failed to load categories', err));
  }, []);

  return (
    <header className="bg-gradient-to-r from-purple-600 to-orange-400 text-white py-12 px-4">
      <div className="container mx-auto text-center">
        <div className="mb-6">
          <span className="inline-flex items-center px-4 py-2 bg-white bg-opacity-20 rounded-full text-sm font-medium">
            <PiBuildingOfficeBold className="mr-2 text-2xl" />
            A Unified Marketplace for Students
          </span>
        </div>
        <h1 className="text-5xl font-extrabold leading-tight mb-4">
          One Stop Solution <br />
          <span className="text-yellow-300">MarketPlace</span> & <span className="text-pink-300">Study Hub</span>
        </h1>
        <p className="text-lg mb-8">
          Buy, sell, or trade items, access study materials,<br /> and earn money all in one place.
        </p>
        <div className="max-w-xl mx-auto relative">
          <input
            type="text"
            placeholder="Search for products or academic materials"
            className="w-full py-3 px-4 rounded-full text-black focus:outline-none"
          />
          <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
        </div>
      </div>

      <nav className="mt-10 overflow-x-auto">
        <ul className="flex flex-wrap justify-center gap-4 px-4">
          {categories.map(cat => (
            <li key={cat._id}>
              <Button
                variant="secondary" // change from "outline" to "secondary"
                onClick={() => navigate(`/products?category=${cat._id}`)}
                className="capitalize"
              >
                {cat.name.replace(/_/g, ' ')}
              </Button>
            </li>
          ))}
        </ul>
      </nav>

    </header>
  );
};

export default Header;
