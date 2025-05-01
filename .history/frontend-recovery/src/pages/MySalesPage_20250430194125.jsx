import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { PRODUCT_API_ENDPOINT } from '@/utils/data';

import AdminSidebar from '/AdminSidebar';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const MySalesPage = () => {
  const { user, token } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  useEffect(() => {
    const fetchMyProducts = async () => {
      try {
        const res = await axios.get(`${PRODUCT_API_ENDPOINT}/seller/${user._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProducts(res.data.data);
      } catch (err) {
        console.error('Failed to fetch user products', err);
      } finally {
        setLoading(false);
      }
    };

    if (user?._id) fetchMyProducts();
  }, [user, token]);

  const filteredProducts = products.filter((product) => {
    if (selectedCategory && product.category !== selectedCategory) return false;
    if (selectedSubcategory && product.subcategory !== selectedSubcategory) return false;
    return true;
  });

  const handleClearFilters = () => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
  };

  return (
    <>
      
      <div className="flex min-h-screen">
        <AdminSidebar
          onCategorySelect={setSelectedCategory}
          onSubcategorySelect={setSelectedSubcategory}
          selectedCategory={selectedCategory}
          selectedSubcategory={selectedSubcategory}
        />
        <div className="flex-1 p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">My Product Listings</h1>
            <Button onClick={() => navigate('/admin/products/create')}>
              Add New Product
            </Button>
          </div>

          {loading ? (
            <div>Loading...</div>
          ) : (
            <>
              {(selectedCategory || selectedSubcategory) && (
                <Button variant="outline" onClick={handleClearFilters} className="mb-4">
                  Clear Filters
                </Button>
              )}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product._id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <img
                              src={product.images?.[0] ? `${BASE_URL}${product.images[0]}` : '/placeholder-image.jpg'}
                              alt={product.title}
                              className="h-10 w-10 object-cover rounded"
                            />
                            <div>
                              <div>{product.title}</div>
                              <div className="text-sm text-gray-500">{product.description?.slice(0, 50)}...</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="capitalize">{product.category?.name || product.category}</div>
                          <div className="text-sm text-gray-500">{product.subcategory?.name || product.subcategory}</div>
                        </TableCell>
                        <TableCell>${product.price.toFixed(2)}</TableCell>
                        <TableCell>{product.stock}</TableCell>
                        <TableCell>
                          <Badge variant={product.stock > 0 ? 'default' : 'destructive'}>
                            {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                          </Badge>
                        </TableCell>
                        <TableCell className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => navigate(`/products/${product._id}`)}>
                            View
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => navigate(`/admin/products/${product._id}`)}>
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default MySalesPage;
