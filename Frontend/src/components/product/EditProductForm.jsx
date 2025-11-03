//Component for editing an existing product
//Dashnyam
//Fixed Deleting feature to remove product from list
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/utils/axios"; // Use custom axios instance
import { toast } from 'sonner';
import { PRODUCT_API_ENDPOINT, CATEGORY_API_ENDPOINT } from "@/utils/data";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
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

const EditProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const token = useAuthStore(state => state.token);
  // Initialize with null values to prevent controlled/uncontrolled input warnings
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    subcategory: "",
    stock: 1,
    images: []
  });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get(CATEGORY_API_ENDPOINT);
        setCategories(res.data.categories || []);
      } catch (err) {
        console.error('Failed to load categories:', err);
        setCategories([]);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchSubcategories = async () => {
      if (!formData.category) return;
      try {
        const res = await api.get(`${CATEGORY_API_ENDPOINT}/${formData.category}/subcategories`);
        const subcategoriesData = Array.isArray(res.data) ? res.data : (res.data.data || res.data.subcategories || []);
        setSubcategories(subcategoriesData);
      } catch (err) {
        console.error('Failed to load subcategories:', err);
        setSubcategories([]);
      }
    };
    fetchSubcategories();
  }, [formData.category]);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await api.get(`${PRODUCT_API_ENDPOINT}/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const product = res.data.product || res.data;
        // Ownership check to avoid showing edit form for someone else's product)
        if (product.sellerId && user?.id && product.sellerId !== user.id) {
          toast.error('You are not authorized to edit this product');
          navigate('/products');
          return;
        }
        setFormData({
          title: product.title || "",
          description: product.description || "",
          price: product.price || 0,
          category: product.category?._id || product.category || "",
          subcategory: product.subcategory?._id || product.subcategory || "",
          stock: product.stock || 0,
          images: product.images || []
        });
        setError("");
      } catch (err) {
        console.error("Error fetching product:", err);
        setError(err.response?.data?.message || err.message || "Failed to fetch product");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, token, navigate, user?.id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Delete title field 
      const payload = { ...formData, name: formData.title };
      delete payload.title;
      await api.put(
        `${PRODUCT_API_ENDPOINT}/${id}`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success('Product updated');
      navigate("/my-sales");
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred");
      toast.error(err.response?.data?.message || 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return; // Prevent double clicks
    setDeleting(true);
    setError('');
    try {
      const res = await api.delete(`${PRODUCT_API_ENDPOINT}/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(res.data?.message || 'Product deleted');
      navigate('/my-sales');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete product';
      setError(msg);
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl p-6 mx-auto">
        <Button variant="outline" onClick={() => navigate(-1)}>← Back</Button>
      <h1 className="mb-6 text-2xl font-bold">Edit Product</h1>
      {error && <div className="mb-4 text-red-500">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="title">Product Title</Label>
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
          <Label htmlFor="category">Category</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value, subcategory: "" })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id || cat._id} value={cat.id || cat._id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="subcategory">Subcategory</Label>
          <Select
            value={formData.subcategory}
            onValueChange={(value) => setFormData({ ...formData, subcategory: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a subcategory" />
            </SelectTrigger>
            <SelectContent>
              {subcategories.map((sub) => (
                <SelectItem key={sub.id || sub._id} value={sub.id || sub._id}>{sub.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-between gap-2">
          <Button type="submit" disabled={loading || deleting}>{loading ? "Updating..." : "Update Product"}</Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="destructive" disabled={loading || deleting}>{deleting ? "Deleting..." : "Delete Product"}</Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64">
              <p className="mb-3 text-sm font-medium">Delete this product?</p>
              <p className="mb-4 text-xs text-muted-foreground">It will be marked inactive and removed from public listings.</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm">Cancel</Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleting}
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete();
                  }}
                >{deleting ? 'Deleting…' : 'Confirm'}</Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </form>
    </div>
  );
};

export default EditProductForm;

