  import React, { useEffect, useState } from 'react';
  import { useNavigate } from 'react-router-dom';
  import api from "@/utils/axios";
  import { PRODUCT_API_ENDPOINT } from '@/utils/data';
  import { getProductImageUrl } from '@/utils/productHelpers';

  import ProductSidebar from '../components/product/ProductSideBar';
  import { Button } from '@/components/ui/button';
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
  import { Badge } from '@/components/ui/badge';
  import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
  import PdfIcon from '@/assets/Pdf.png';
  import { useAuthStore } from '@/store/useAuthStore';
  import { toast } from 'sonner';
  import { formatSubcategory } from '@/utils/formatSubcategory';
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
          // Try the user ID in different formats
          const userId = user?._id || user?.id || user?.userId;
          const res = await api.get(`${PRODUCT_API_ENDPOINT}/seller/${userId}`, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            withCredentials: false
          });
          // Handle the new response format with success wrapper and ensure products have consistent ID format
          const productsData = res.data?.success ? res.data.products : res.data.products || [];
          const processedProducts = productsData.map(product => {
            // Make sure each product has both id and _id fields
            return {
              ...product,
              category: product.category,
              subcategory: product.subcategory.id,
              subcategoryName: product.subcategory.name, 
              id: product.id,
              _id: product._id
            };
          });
          setProducts(processedProducts);
        } catch (err) {
          console.error('Failed to fetch user products', err);
          // Set empty array to avoid errors in rendering
          setProducts([]);
          toast?.error?.('Failed to load your products. Please try again later.');
        } finally {
          setLoading(false);
        }
      };

      if ((user?._id || user?.id) && token) fetchMyProducts();
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
        <ProductSidebar
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
                      <TableRow key={product._id || product.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Dialog>
                    <DialogTrigger asChild>
                      {product.images?.length > 0 ? (
                        <img
                          src={getProductImageUrl({images: product.images})}
                          alt={product.title || product.name}
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
                          src={getProductImageUrl({images: product.images})}
                          alt={product.title || product.name}
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
                    <div>{product.name}</div>
                    <div className="text-sm text-gray-500">
                      {product.description?.slice(0, 20)}...
                    </div>
                  </div>
                </div>
                    </TableCell>

                        <TableCell>
                          <div className="capitalize">{product.category?.name || product.category}</div>
                          <div className="text-sm text-gray-500">{ product.subcategoryName || formatSubcategory(product.subcategory)}</div>
                        </TableCell>
                        <TableCell>
                          ${Number(product.price || 0).toFixed(2)}
                          {product.isDigital && (
                            <span className="block mt-1 text-xs text-indigo-600">
                              Downloads: {product.digitalDownloadCount || 0}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{product.stock}</TableCell>
                        <TableCell>
                          <Badge variant={product.stock > 0 ? 'default' : 'destructive'}>
                            {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                          </Badge>
                        </TableCell>
                        <TableCell className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => navigate(`/products/${product._id || product.id}`)}>
                            View
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => navigate(`/admin/products/${product._id || product.id}`)}>
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => navigate(`/admin/products/${product._id || product.id}/status`)}>
                            Status
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <p className="mt-8 text-gray-600">
                View and manage order requests for specific products using the "Status" button on each product.
              </p>
            </>
          )}
        </div>
      </div>
    );
  };

  export default MySalesPage;

