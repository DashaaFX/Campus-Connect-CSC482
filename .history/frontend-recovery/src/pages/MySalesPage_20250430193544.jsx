import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '@/components/components_lite/Navbar';
import AdminSidebar from 'AdminSidebar';
import AdminProducts from '@/pages/AdminProducts';
import { Button } from '@/components/ui/button';

const MySalesPage = () => {
  const navigate = useNavigate();

  return (
    <>
      <Navbar />
      <div className="flex min-h-screen">
        <AdminSidebar
          onCategorySelect={() => {}}
          onSubcategorySelect={() => {}}
          selectedCategory={null}
          selectedSubcategory={null}
        />
        <div className="flex-1 p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">My Sales & Product Listings</h1>
            <Button onClick={() => navigate('/admin/products/create')}>
              Add New Product
            </Button>
          </div>
          <AdminProducts />
        </div>
      </div>
    </>
  );
};

export default MySalesPage;
