import React, { useEffect, useState } from 'react';
import { PiBuildingOfficeBold } from 'react-icons/pi';
import api from "@/utils/axios";
import { CATEGORY_API_ENDPOINT } from '@/utils/data';
import { useNavigate } from 'react-router-dom';
import Carousel1 from '@/components/ui/Carousel1';
import { categoryImages } from "@/utils/categoryImages";

const Header = () => {
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get(CATEGORY_API_ENDPOINT)
      .then(res => setCategories(res.data.categories || []))
      .catch(err => console.error('Failed to load categories', err));
  }, []);

    return (
    <header className="relative px-4 py-12 overflow-hidden text-white bg-gradient-to-br from-gray-900 via-purple-900 to-gray-800">
  <div className="container relative z-10 mx-auto text-center">
        <div className="mb-6">
          <span className="inline-flex items-center px-4 py-2 text-sm font-medium border rounded-full shadow-md bg-white/10 border-white/20 backdrop-blur">
            <PiBuildingOfficeBold className="mr-2 text-2xl text-yellow-300" />
            A Unified Marketplace for Students
          </span>
        </div>
        <h1 className="mb-4 text-5xl font-extrabold leading-tight drop-shadow-lg">
          One Stop Solution <br />
          <span className="text-yellow-300">MarketPlace</span> & <span className="text-pink-400">Study Hub</span>
        </h1>
        <p className="mb-8 text-lg text-white/80">
          Buy, sell, or trade items, access study materials,<br /> and earn money all in one place.
        </p>
        
      </div>

      {categories.length > 0 && (
        <div className="flex justify-center mt-10">
          <div className="w-full max-w-5xl p-4 border shadow-lg rounded-2xl bg-white/5 border-white/10 backdrop-blur">
            <Carousel1
              items={categories.map(cat => {
                const cleanName = (cat.name || "").toLowerCase();
                return {
                  title: cat.name ? cat.name.replace(/_/g, " ") : "No Name",
                  description: cat.description || "",
                  id: cat._id,
                  image: categoryImages[cleanName] || "/images/categories/default.jpg",
                  onClick: () => navigate(`/products?category=${cat._id}`),
                };
              })}
            />
          </div>
        </div>
      )}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-30 mix-blend-soft-light" style={{backgroundImage: 'url(https://www.transparenttextures.com/patterns/diamond-upholstery.png)'}} />
    </header>
  );
};

export default Header;

