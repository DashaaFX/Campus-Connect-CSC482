// src/components/components_lite/PublicProductPage.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { PRODUCT_API_ENDPOINT, CATEGORY_API_ENDPOINT } from "@/utils/data";
import ProductList from "./ProductsList";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select";

const PublicProductPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [sort, setSort] = useState("");

  // Read query params on first load
  useEffect(() => {
    const initialSearch = searchParams.get('q') || "";
    const initialCategory = searchParams.get('category') || "";
    const initialSubcategory = searchParams.get('subcategory') || "";
    const initialSort = searchParams.get('sort') || "";

    setSearch(initialSearch);
    setSelectedCategory(initialCategory);
    setSelectedSubcategory(initialSubcategory);
    setSort(initialSort);
  }, [location.search]);

  // Load categories
  useEffect(() => {
    axios
      .get(CATEGORY_API_ENDPOINT)
      .then(res => setCategories(res.data))
      .catch(err => console.error('Failed to load categories', err));
  }, []);

  // Load subcategories when category changes
  useEffect(() => {
    if (!selectedCategory) {
      setSubcategories([]);
      return;
    }
    axios
      .get(`${CATEGORY_API_ENDPOINT}/${selectedCategory}/subcategories`)
      .then(res => setSubcategories(res.data))
      .catch(err => console.error('Failed to load subcategories', err));
  }, [selectedCategory]);

  // Fetch products
  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams();

      if (search) params.append('q', search);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedSubcategory) params.append('subcategory', selectedSubcategory);
      if (sort) params.append('sort', sort);

      const res = await axios.get(`${PRODUCT_API_ENDPOINT}?${params.toString()}`);
      setProducts(res.data.products || []);
    } catch (err) {
      console.error("Failed to fetch products", err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, selectedCategory, selectedSubcategory, sort]);

  //  When user changes filters, update URL
  const updateUrlParams = () => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedSubcategory) params.set('subcategory', selectedSubcategory);
    if (sort) params.set('sort', sort);

    navigate(`/products?${params.toString()}`);
  };

  // When user selects something new
  useEffect(() => {
    updateUrlParams();
  }, [search, selectedCategory, selectedSubcategory, sort]);

  const handleClearFilters = () => {
    setSearch("");
    setSelectedCategory("");
    setSelectedSubcategory("");
    setSort("");
  };

  return (
    <> 
    
      <div className="px-4 py-10 mx-auto max-w-7xl">
        <h1 className="mb-6 text-3xl font-bold">Browse Products</h1>

        {/* Filters and Search */}
        <div className="flex flex-col gap-4 mb-8 md:flex-row">
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />

          <Select
            value={selectedCategory}
            onValueChange={(value) => {
              setSelectedCategory(value);
              setSelectedSubcategory(""); // Clear subcategory when new category selected
            }}
          >
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat._id} value={cat._id}>
                  {cat.name.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedSubcategory}
            onValueChange={(value) => setSelectedSubcategory(value)}
            disabled={!selectedCategory}
          >
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Subcategory" />
            </SelectTrigger>
            <SelectContent>
              {subcategories.map(sub => (
                <SelectItem key={sub._id} value={sub._id}>
                  {sub.name.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sort}
            onValueChange={(value) => setSort(value)}
          >
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price">Price: Low to High</SelectItem>
              <SelectItem value="-price">Price: High to Low</SelectItem>
              <SelectItem value="-createdAt">Newest First</SelectItem>
              <SelectItem value="createdAt">Oldest First</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleClearFilters}>
            Clear Filters
          </Button>
        </div>

        {/* Products or No Products */}
        {products.length === 0 ? (
          <div className="py-10 text-center text-gray-500">
            <h2 className="mb-2 text-2xl font-semibold">No products found</h2>
            <p>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <ProductList products={products} />
        )}
      </div>
    </>
  );
};

export default PublicProductPage;
