import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { fetchProducts } from '../../redux/productSlice';
import AdminSidebar from './AdminSidebar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';

const AdminProducts = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { products, loading, error } = useSelector((state) => state.products);
  
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  useEffect(() => {
    // Fetch all products without pagination
    dispatch(fetchProducts());
  }, [dispatch]);

  const filteredProducts = products.filter(product => {
    if (selectedCategory && product.category !== selectedCategory) return false;
    if (selectedSubcategory && product.subcategory !== selectedSubcategory) return false;
    return true;
  });

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setSelectedSubcategory(null);
  };

  const handleSubcategorySelect = (subcategory) => {
    setSelectedSubcategory(subcategory);
  };

  const handleClearFilters = () => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
  };

  if (loading) return <div className="flex justify-center p-8">Loading products...</div>;
  if (error) return <div className="flex justify-center p-8 text-red-500">Error: {error}</div>;

  return (
    <div className="flex min-h-screen">
      <AdminSidebar 
        onCategorySelect={handleCategorySelect}
        onSubcategorySelect={handleSubcategorySelect}
        selectedCategory={selectedCategory}
        selectedSubcategory={selectedSubcategory}
      />
      
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            {selectedCategory ? selectedCategory : 'All'} Products
            {selectedSubcategory && ` > ${selectedSubcategory.replace(/_/g, ' ')}`}
          </h1>
          <div className="flex gap-2">
            {(selectedCategory || selectedSubcategory) && (
              <Button variant="outline" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            )}
            <Button asChild>
              <Link to="/admin/products/create">Add New Product</Link>
            </Button>
          </div>
        </div>

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
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      {product.images?.[0] ? (
                        <img 
                          src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}${product.images[0]}`}
                          alt={product.title}
                          className="h-10 w-10 object-cover rounded"
                          onError={(e) => {
                            e.target.src = '/placeholder-image.jpg';
                            e.target.onerror = null; // Prevent infinite loop
                          }}
                        />
                      ) : (
                        <div className="h-10 w-10 bg-gray-200 rounded flex items-center justify-center">
                          <span className="text-xs text-gray-500">No Image</span>
                        </div>
                      )}
                      <div>
                        <div>{product.title}</div>
                        <div className="text-sm text-gray-500">
                          {product.description?.substring(0, 50)}...
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="capitalize">{product.category}</div>
                    <div className="text-sm text-gray-500">
                      {product.subcategory?.replace(/_/g, ' ')}
                    </div>
                  </TableCell>
                  <TableCell>${product.price?.toFixed(2)}</TableCell>
                  <TableCell>{product.stock}</TableCell>
                  <TableCell>
                    <Badge variant={product.stock > 0 ? 'default' : 'destructive'}>
                      {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/admin/products/${product._id}`)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Simple Pagination Alternative (uncomment if needed) */}
        {/* 
        {filteredProducts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No products found matching your filters
          </div>
        )}
        */}
      </div>
    </div>
  );
};

export default AdminProducts;