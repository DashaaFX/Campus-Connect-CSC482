  import React, { useEffect, useState } from 'react';
  import { useNavigate } from 'react-router-dom';
  import axios from 'axios';
  import { PRODUCT_API_ENDPOINT } from '@/utils/data';

  import AdminSidebar from './AdminSidebar';
  import { Button } from '@/components/ui/button';
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
  import { Badge } from '@/components/ui/badge';
  import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
  import PdfIcon from '@/assets/Pdf.png';
  import {useAuthStore} from '@/store/useAuthStore';
  const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  const MySalesPage = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedSubcategory, setSelectedSubcategory] = useState(null);
    const { user, token, fetchUser } = useAuthStore();

    useEffect(() => {
  if (!user) fetchUser();
  }, [user, fetchUser]);
    useEffect(() => {
      const fetchMyProducts = async () => {
        if (!token) return;
        try {
          const res = await axios.get(`${PRODUCT_API_ENDPOINT}/seller/${user._id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setProducts(res.data.products || []);
        } catch (err) {
          console.error('Failed to fetch user products', err);
        } finally {
          setLoading(false);
        }
      };

      if (user?._id && token) fetchMyProducts();
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
      <div className="flex min-h-screen">
        <AdminSidebar
          onCategorySelect={setSelectedCategory}
          onSubcategorySelect={setSelectedSubcategory}
          selectedCategory={selectedCategory}
          selectedSubcategory={selectedSubcategory}
        />
        <div className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">My Product Listings</h1>
            <Button onClick={() => navigate('/products/create')}>
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
              <div className="border rounded-md">
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
                  <Dialog>
                    <DialogTrigger asChild>
                      {product.images?.length > 0 ? (
                        <img
                          src={
                            product.images[0].startsWith("http")
                              ? product.images[0]
                              : `${BASE_URL}${product.images[0]}`
                          }
                          alt={product.title}
                          className="object-cover w-16 h-16 rounded cursor-pointer hover:opacity-80"
                        />
                      ) : product.pdf?.length > 0 ? (
                        <img
                        src={PdfIcon} 
                        alt="PDF"
                        className="w-16 h-16 cursor-pointer hover:opacity-80"
                      />
                      ) : (
                        <img
                          src="/placeholder-image.jpg"
                          alt="placeholder"
                          className="object-cover w-16 h-16 rounded cursor-pointer"
                        />
                      )}
                    </DialogTrigger>

                    <DialogContent className="w-full max-w-3xl h-[80vh]">
                      {product.images?.length > 0 ? (
                        <img
                          src={
                            product.images[0].startsWith("http")
                              ? product.images[0]
                              : `${BASE_URL}${product.images[0]}`
                          }
                          alt={product.title}
                          className="object-contain w-full h-full rounded"
                        />
                      ) : product.pdf?.length > 0 ? (
                        <iframe
                          src={`https://docs.google.com/viewer?url=${encodeURIComponent(
                            product.pdf[0].startsWith("http")
                              ? product.pdf[0]
                              : `${BASE_URL}${product.pdf[0]}`
                          )}&embedded=true`}
                          title="PDF Preview"
                          className="w-full h-full border rounded"
                        />
                      ) : (
                        <img
                          src="/placeholder-image.jpg"
                          alt="placeholder"
                          className="object-contain w-full h-full rounded"
                        />
                      )}
                    </DialogContent>
                  </Dialog>

                  <div>
                    <div>{product.title}</div>
                    <div className="text-sm text-gray-500">
                      {product.description?.slice(0, 20)}...
                    </div>
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
                        <TableCell className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => navigate(`/products/${product._id}`)}>
                            View
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => navigate(`/admin/products/${product._id}`)}>
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => navigate(`/admin/products/${product._id}/status`)}>
                            Status
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
    );
  };

  export default MySalesPage;
