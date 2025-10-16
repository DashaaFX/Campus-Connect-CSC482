
//Main component to post a new product
import React, { useState, useEffect } from "react";
import api from "@/utils/axios";
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
import FileUploader from "@/components/ui/FileUploader";

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
  const [isDigital, setIsDigital] = useState(false);
  const [documentMeta, setDocumentMeta] = useState(null); // { key, url (maybe null), name, format }
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const fetchCategories = async () => {
      try {
        const res = await api.get(CATEGORY_API_ENDPOINT);
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
        const res = await api.get(`${CATEGORY_API_ENDPOINT}/${formData.category}/subcategories`);
        if (!mounted) return;
        let subcategoriesData;
        if (Array.isArray(res.data)) {
          subcategoriesData = res.data;
        } else if (res.data.data && Array.isArray(res.data.data)) {
          subcategoriesData = res.data.data;
        } else if (res.data.subcategories && Array.isArray(res.data.subcategories)) {
          subcategoriesData = res.data.subcategories;
        } else if (res.data && typeof res.data === 'object') {
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

    const userId = user?.id || user?._id || user?.userId;

    const productData = {
      ...formData,
      images: isDigital ? [] : productImages,
      userId: userId,
      sellerId: userId
    };

    if (isDigital) {
      if (!documentMeta?.key) {
        setError("Please upload a document for this digital product.");
        setLoading(false);
        return;
      }
      productData.documentKey = documentMeta.key;
      productData.digitalFormat = (documentMeta.name?.split('.').pop() || '').toLowerCase();
      productData.previewImage = documentMeta.url || undefined; // backend will fallback placeholder if missing
      // For digital products, override stock to 0
      productData.stock = 0;
    }
    setLoading(true);
    try {
      const res = await api.post(PRODUCT_API_ENDPOINT, productData, {
        headers: {
          "Content-Type": "application/json",
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
      <div className="flex items-center mb-4 space-x-4">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="radio"
            name="productType"
            checked={!isDigital}
            onChange={() => { setIsDigital(false); setDocumentMeta(null); }}
          />
          <span>Physical</span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="radio"
            name="productType"
            checked={isDigital}
            onChange={() => { setIsDigital(true); setProductImages([]); }}
          />
          <span>Digital (PDF/DOC/DOCX)</span>
        </label>
      </div>
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
            {!isDigital && (
              <>
                <Label htmlFor="stock">Stock</Label>
                <Input id="stock" name="stock" type="number" value={formData.stock} onChange={handleChange} required />
              </>
            )}
            {isDigital && (
              <div className="pt-6 text-sm text-gray-500">Unlimited (digital)</div>
            )}
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
                {categories.find(c => c.id === formData.category)?.name || "Select a category"}
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
              {subcategories.map((sub) => (
                <SelectItem key={sub.id || sub._id} value={sub.id || sub._id}>
                  {sub.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!isDigital && (
          <div>
            <MultiImageUploader 
              onUploadComplete={setProductImages}
              uploadType="product"
            />
          </div>
        )}
        {isDigital && (
          <div className="space-y-2">
            <Label>Document File</Label>
            <FileUploader
              uploadType="document"
              multiple={false}
              maxFiles={1}
              onUploadComplete={(meta) => {
                // meta: { name, size, key, url, private, progress }
                setDocumentMeta({ key: meta.key, url: meta.url, name: meta.name });
              }}
            />
            {documentMeta && (
              <p className="text-xs text-gray-600">Uploaded: {documentMeta.name}</p>
            )}
          </div>
        )}

        <Button
          type="submit"
          disabled={
            loading ||
            !formData.title ||
            !formData.price ||
            !formData.category ||
            !formData.subcategory ||
            (isDigital && !documentMeta?.key)
          }
        >
          {loading ? "Creating..." : (isDigital ? "Create Digital Product" : "Create Product")}
        </Button>
      </form>
    </div>
  );
};

export default PostProduct;

