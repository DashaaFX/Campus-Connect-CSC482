// Updated PostProduct.jsx with dynamic categories/subcategories from API
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";

import { createNewProduct } from "@/redux/productSlice";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import Navbar from "../components_lite/Navbar";
import { CATEGORY_API_ENDPOINT } from "@/utils/data";

const conditionOptions = ['new', 'like new', 'good', 'fair', 'poor'];

const PostProduct = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const token = useSelector((state) => state.auth.token);
  const productLoading = useSelector((state) => state.products?.loading || false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    subcategory: "",
    condition: "good",
    stock: 1,
    attributes: {}
  });
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  useEffect(() => {
    axios.get(CATEGORY_API_ENDPOINT).then(res => setCategories(res.data));
  }, []);

  useEffect(() => {
    if (formData.category) {
      axios.get(`${CATEGORY_API_ENDPOINT}/${formData.category}/subcategories`)
        .then(res => setSubcategories(res.data));
    } else {
      setSubcategories([]);
    }
  }, [formData.category]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'category' && { subcategory: '' })
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 10) {
      toast.error('You can upload a maximum of 10 images');
      return;
    }
    const newImagePreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews([...imagePreviews, ...newImagePreviews]);
    setImages([...images, ...files]);
  };

  const removeImage = (index) => {
    const newImages = [...images];
    const newPreviews = [...imagePreviews];
    newImages.splice(index, 1);
    newPreviews.splice(index, 1);
    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.price || !formData.category || !formData.subcategory) {
      toast.error('Please fill all required fields');
      return;
    }
    if (images.length === 0) {
      toast.error('Please upload at least one product image');
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('price', formData.price);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('subcategory', formData.subcategory);
      formDataToSend.append('condition', formData.condition);
      formDataToSend.append('stock', formData.stock);
      images.forEach(image => formDataToSend.append('images', image));

      const result = await dispatch(createNewProduct({ formData: formDataToSend, token })).unwrap();
      if (result) {
        toast.success('Product created successfully');
        navigate('/admin/products');
      }
    } catch (error) {
      console.error('Product creation error:', error);
      toast.error(error.message || 'Failed to create product');
    }
  };

  return (
    <div>
      
      <div className="flex items-center justify-center w-screen my-5">
        <form
          onSubmit={handleSubmit}
          className="p-8 max-w-4xl border border-gray-500 shadow-sm hover:shadow-xl hover:shadow-red-300 rounded-lg"
        >
          <h1 className="text-2xl font-bold mb-6">Create New Product</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Product Title *</Label>
              <Input type="text" name="title" value={formData.title} onChange={handleChange} required />
            </div>
            <div>
              <Label>Price *</Label>
              <Input type="number" name="price" value={formData.price} onChange={handleChange} min="0.01" step="0.01" required />
            </div>
            <div>
              <Label>Category *</Label>
              <Select value={formData.category} onValueChange={value => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {categories.map(cat => (
                      <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subcategory *</Label>
              <Select value={formData.subcategory} onValueChange={value => setFormData(prev => ({ ...prev, subcategory: value }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a subcategory" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {subcategories.map(sub => (
                      <SelectItem key={sub._id} value={sub._id}>{sub.name}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Condition</Label>
              <Select value={formData.condition} onValueChange={value => setFormData(prev => ({ ...prev, condition: value }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {conditionOptions.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Stock Quantity</Label>
              <Input type="number" name="stock" value={formData.stock} onChange={handleChange} min="1" />
            </div>
          </div>

          <div className="mt-6">
            <Label>Description</Label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows={4} className="w-full border rounded" />
          </div>

          <div className="mt-6">
            <Label>Product Images *</Label>
            <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" id="product-images" />
            <label htmlFor="product-images" className="btn">Upload Images</label>
            <span>{images.length} of 10 images selected</span>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {imagePreviews.map((src, i) => (
                <div key={i} className="relative">
                  <img src={src} alt={`preview-${i}`} className="h-32 w-full object-cover rounded" />
                  <button type="button" className="absolute top-1 right-1" onClick={() => removeImage(i)}>×</button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <Button type="submit" disabled={productLoading || images.length === 0}>
              {productLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>) : "Create Product"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostProduct;
