import React, { useState } from "react";
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

const productCategories = [
  'academic', 'electronics', 'dorm', 'clothing', 'supplies', 'sports', 'miscellaneous'
];

const conditionOptions = [
  'new', 'like new', 'good', 'fair', 'poor'
];

const PostProduct = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const token = useSelector((state) => state.auth.token);  //Added
  const productLoading = useSelector((state) => state.product?.loading || false);
  const productError = useSelector((state) => state.product?.error || null);
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
      
      // Append all form fields
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('price', formData.price);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('subcategory', formData.subcategory);
      formDataToSend.append('condition', formData.condition);
      formDataToSend.append('stock', formData.stock);
      
      // Append each image
      images.forEach(image => {
        formDataToSend.append('images', image);
      });
  
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

  const getSubcategories = () => {
    const categoryMap = {
      academic: ['textbooks', 'lab_manuals', 'solution_guides', 'lecture_notes', 'exam_papers', 'study_guides', 'research_papers'],
      electronics: ['laptops', 'calculators', 'tablets', 'headphones', 'chargers'],
      dorm: ['minifridges', 'bedding', 'storage', 'lighting'],
      clothing: ['formal_wear', 'winter_gear', 'university_merch', 'bags', 'footwear'],
      supplies: ['notebooks', 'pens', 'stationery', 'printer_supplies'],
      sports: ['yoga_mats', 'bikes', 'sports_gear'],
      miscellaneous: ['appliances', 'games', 'suitcases', 'art_supplies']
    };
    
    return formData.category ? categoryMap[formData.category] || [] : [];
  };

  return (
    <div>
      <Navbar />
      <div className="flex items-center justify-center w-screen my-5">
        <form
          onSubmit={handleSubmit}
          className="p-8 max-w-4xl border border-gray-500 shadow-sm hover:shadow-xl hover:shadow-red-300 rounded-lg"
        >
          <h1 className="text-2xl font-bold mb-6">Create New Product</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product Title */}
            <div>
              <Label>Product Title *</Label>
              <Input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter product title"
                className="focus-visible:ring-offset-0 focus-visible:ring-0 my-1"
                required
              />
            </div>

            {/* Price */}
            <div>
              <Label>Price *</Label>
              <Input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="Enter product price"
                className="focus-visible:ring-offset-0 focus-visible:ring-0 my-1"
                min="0.01"
                step="0.01"
                required
              />
            </div>

            {/* Category */}
            <div>
              <Label>Category *</Label>
              <Select
                name="category"
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {productCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Subcategory */}
            <div>
              <Label>Subcategory *</Label>
              <Select
                name="subcategory"
                value={formData.subcategory}
                onValueChange={(value) => setFormData(prev => ({ ...prev, subcategory: value }))}
                disabled={!formData.category}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a subcategory" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {getSubcategories().map((subcategory) => (
                      <SelectItem key={subcategory} value={subcategory}>
                        {subcategory.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Condition */}
            <div>
              <Label>Condition</Label>
              <Select
                name="condition"
                value={formData.condition}
                onValueChange={(value) => setFormData(prev => ({ ...prev, condition: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {conditionOptions.map((condition) => (
                      <SelectItem key={condition} value={condition}>
                        {condition.charAt(0).toUpperCase() + condition.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Stock */}
            <div>
              <Label>Stock Quantity</Label>
              <Input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                placeholder="Enter stock quantity"
                className="focus-visible:ring-offset-0 focus-visible:ring-0 my-1"
                min="1"
              />
            </div>
          </div>

          {/* Description */}
          <div className="mt-6">
            <Label>Description</Label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Enter product description"
            />
          </div>

          {/* Image Upload */}
          <div className="mt-6">
            <Label>Product Images *</Label>
            <div className="mt-2">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="product-images"
              />
              <label
                htmlFor="product-images"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
              >
                Upload Images
              </label>
              <span className="ml-2 text-sm text-gray-500">
                {images.length} of 10 images selected
              </span>
            </div>
            
            {/* Image Previews */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview}
                    alt={`Preview ${index}`}
                    className="h-32 w-full object-cover rounded-md"
                  />
                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(index)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8 flex justify-end">
            <Button
              type="submit"
              className="px-6 py-2"
              disabled={productLoading || images.length === 0}
            >
              {productLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Product"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostProduct;