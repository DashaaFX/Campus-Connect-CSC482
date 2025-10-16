import React, { useEffect, useState } from "react";
import { useAuthStore } from '@/store/useAuthStore';
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import api from "@/utils/axios";
import { PRODUCT_API_ENDPOINT, CATEGORY_API_ENDPOINT } from "@/utils/data";
import ProductList from "../components/product/ProductsList";
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
  const { user } = useAuthStore();
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [sort, setSort] = useState("");
  const [digitalFilter, setDigitalFilter] = useState(''); // '', 'true', 'false'
  const [currentPage, setCurrentPage] = useState(1);
  const PRODUCTS_PER_PAGE = 9;
  useEffect(() => {
    const initialSearch = searchParams.get('search') || "";
    const initialCategory = searchParams.get('category') || "";
    const initialSubcategory = searchParams.get('subcategory') || "";
  const initialSort = searchParams.get('sort') || "";
  const initialDigital = searchParams.get('digital') || '';

    setSearch(initialSearch);
    setSelectedCategory(initialCategory);
    setSelectedSubcategory(initialSubcategory);
  setSort(initialSort);
  setDigitalFilter(initialDigital);
  }, [location.search]);

  // Load categories
  useEffect(() => {
    api
      .get(CATEGORY_API_ENDPOINT)
      .then(res => {
        setCategories(res.data.categories || []);
      })
      .catch(err => {
        console.error('Failed to load categories', err);
        setCategories([]);
      });
  }, []);

  // Load subcategories when category changes
  useEffect(() => {
    if (!selectedCategory) {
      setSubcategories([]);
      return;
    }
    api
      .get(`${CATEGORY_API_ENDPOINT}/${selectedCategory}/subcategories`)
      .then(res => {
        // Handle multiple formats: direct array, nested in data property, or object with numbered keys
        let subcategoriesData;
        if (Array.isArray(res.data)) {
          subcategoriesData = res.data;
        } else if (res.data.data && Array.isArray(res.data.data)) {
          subcategoriesData = res.data.data;
        } else if (res.data.subcategories && Array.isArray(res.data.subcategories)) {
          subcategoriesData = res.data.subcategories;
        } else if (res.data && typeof res.data === 'object') {
          // Convert object with numbered keys to array
          subcategoriesData = Object.values(res.data).filter(item => item && typeof item === 'object' && item.id);
        } else {
          subcategoriesData = [];
        }
        setSubcategories(subcategoriesData);
      })
      .catch(err => {
        console.error('Failed to load subcategories', err);
        setSubcategories([]);
      });
  }, [selectedCategory]);

  // Fetch products
  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams();

      if (search) params.append('search', search);
      if (selectedCategory) params.append('category', selectedCategory);
      //if (selectedSubcategory) params.append('subcategory', selectedSubcategory);
  if (sort) params.append('sort', sort);
  if (digitalFilter) params.append('digital', digitalFilter);

      const res = await api.get(`${PRODUCT_API_ENDPOINT}?${params.toString()}`);
      let allProducts = res.data.products || [];
      // Filter out products created by the logged-in user
      if (user && user.id) {
        allProducts = allProducts.filter(
          (p) => p.sellerId !== user.id && p.userId !== user.id
        );
      }
      //filter subcategory separately, for Sort by dropdown
      if (selectedSubcategory) {
        allProducts = allProducts.filter(p =>
          p.subcategory === selectedSubcategory ||
          p.subcategory?.id === selectedSubcategory ||
          p.subcategory?._id === selectedSubcategory
        );
      }
      // Sort products 
      if (sort === "price") {
        allProducts = [...allProducts].sort((a, b) => Number(a.price) - Number(b.price));
      } else if (sort === "-price") {
        allProducts = [...allProducts].sort((a, b) => Number(b.price) - Number(a.price));
      } else if (sort === "createdAt") {
        allProducts = [...allProducts].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      } else if (sort === "-createdAt") {
        allProducts = [...allProducts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }

      setProducts(allProducts);
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
    if (search) params.set('search', search);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedSubcategory) params.set('subcategory', selectedSubcategory);
  if (sort) params.set('sort', sort);
  if (digitalFilter) params.set('digital', digitalFilter);

    navigate(`/products?${params.toString()}`);
  };

  // When user selects something new
  useEffect(() => {
    updateUrlParams();
  }, [search, selectedCategory, selectedSubcategory, sort, digitalFilter]);

  const handleClearFilters = () => {
    setSearch("");
    setSelectedCategory("");
    setSelectedSubcategory("");
  setSort("");
  setDigitalFilter('');
  };
    useEffect(() => {
    setCurrentPage(1);
    }, [search, selectedCategory, selectedSubcategory, sort]);

  const paginatedProducts = products.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
   currentPage * PRODUCTS_PER_PAGE
  );
  const totalPages = Math.ceil(products.length / PRODUCTS_PER_PAGE);
  return (
    <> 
    
      <div className="px-4 py-10 mx-auto max-w-7xl">
        <div className="p-4 mb-6 text-sm border rounded bg-blue-50 text-slate-700">
          <strong>Digital Products:</strong> Items marked with the Digital badge are downloadable documents. You'll receive access after the seller marks your order as completed.
        </div>
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
                <SelectItem key={cat.id || cat._id} value={cat.id || cat._id}>
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
                <SelectItem key={sub.id || sub._id} value={sub.id || sub._id}>
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

          <Select
            value={digitalFilter}
            onValueChange={(value) => setDigitalFilter(value)}
          >
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Products</SelectItem>
              <SelectItem value="true">Digital Only</SelectItem>
              <SelectItem value="false">Physical Only</SelectItem>
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
        ) :  (
          <>
            <ProductList products={paginatedProducts} />
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                ←
              </Button>
              {Array.from({ length: totalPages }, (_, idx) => (
                <Button
                  key={idx + 1}
                  variant={currentPage === idx + 1 ? "default" : "outline"}
                  onClick={() => setCurrentPage(idx + 1)}
                  className="px-3"
                >
                  {idx + 1}
                </Button>
              ))}
              <Button
                variant="outline"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                →
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default PublicProductPage;

