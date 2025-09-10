import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { PRODUCT_API_ENDPOINT, CATEGORY_API_ENDPOINT } from "@/utils/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/store/useAuthStore";
import MultiImageUploader from "@/components/ui/MultiImageUploader";

const PostProduct = () => {
  const user = useAuthStore(state => state.user);
  const token = useAuthStore(state => state.token);

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    stock: 1,
    category: "",
    subcategory: "",
    condition: "good",
  });

  const [productImages, setProductImages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    
    const fetchCategories = async () => {
      try {
        const res = await axios.get(CATEGORY_API_ENDPOINT);
        if (!mounted) return;
        setCategories(res.data.categories || []);
      } catch (err) {
        if (mounted) {
          setError("Failed to load categories");
          setCategories([]);
        }
      }
    };
    
    fetchCategories();
    
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!formData.category) {
      setSubcategories([]);
      return;
    }
    
    let mounted = true;
    
    const fetchSubcategories = async () => {
      try {
        const res = await axios.get(`${CATEGORY_API_ENDPOINT}/${formData.category}/subcategories`);
        if (!mounted) return;
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
      } catch (err) {
        if (mounted) {
          console.error('Failed to load subcategories:', err);
          setSubcategories([]);
        }
      }
    };
    
    fetchSubcategories();
    
    return () => {
      mounted = false;
    };
  }, [formData.category]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const { title, price, category, subcategory } = formData;
    if (!title || !price || !category || !subcategory) {
      setError("Please fill in all required fields.");
      return;
    }

    // Create JSON payload instead of FormData
    // Make sure we have the userId in the correct format
    const userId = user?.id || user?._id || user?.userId;
    
    const productData = {
      ...formData,
      images: productImages, // Array of uploaded image URLs
      userId: userId,
      // Include sellerId explicitly as userId for backend consistency
      sellerId: userId
    };
    setLoading(true);
    try {
      // Log authorization status before request
      const res = await axios.post(PRODUCT_API_ENDPOINT, productData, {
        headers: {
          "Content-Type": "application/json",
          // Explicitly add Authorization header for debugging
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.data.success) {
        navigate("/my-sales");
      } else {
        setError(res.data.message || "Failed to create product.");
      }
    } catch (err) {
      console.error('Product creation error:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.message || "Server error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl p-6 mx-auto">
      <h1 className="mb-6 text-2xl font-bold">Add New Product</h1>
      {error && <div className="mb-4 text-red-500">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4" encType="multipart/form-data">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" value={formData.title} onChange={handleChange} required />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" value={formData.description} onChange={handleChange} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="price">Price</Label>
            <Input id="price" name="price" type="number" value={formData.price} onChange={handleChange} required />
          </div>
          <div>
            <Label htmlFor="stock">Stock</Label>
            <Input id="stock" name="stock" type="number" value={formData.stock} onChange={handleChange} required />
          </div>
        </div>

        <div>
          <Label>Category</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value, subcategory: "" })}
          >
            <SelectTrigger>
              <SelectValue>
                {categories.find(c => c._id === formData.category)?.name || "Select a category"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id || cat._id} value={cat.id || cat._id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Subcategory</Label>
          <Select
            value={formData.subcategory}
            onValueChange={(value) => setFormData({ ...formData, subcategory: value })}
            disabled={!formData.category}
          >
            <SelectTrigger>
              <SelectValue>
                {subcategories.find(s => (s.id || s._id) === formData.subcategory)?.name || "Select a subcategory"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {console.log('Rendering subcategories in PostProduct:', subcategories)}
              {subcategories.map((sub) => (
                <SelectItem key={sub.id || sub._id} value={sub.id || sub._id}>
                  {sub.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <MultiImageUploader 
            onUploadComplete={setProductImages}
            uploadType="product"
          />
        </div>

        <Button
          type="submit"
          disabled={loading || !formData.title || !formData.price || !formData.category || !formData.subcategory}
        >
          {loading ? "Creating..." : "Create Product"}
        </Button>
      </form>
    </div>
  );
};

export default PostProduct;

