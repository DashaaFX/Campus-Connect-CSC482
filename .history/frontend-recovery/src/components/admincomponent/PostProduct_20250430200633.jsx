import React, { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
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

const PostProduct = () => {
  const token = useSelector((state) => state.auth.token);
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

  const [images, setImages] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    axios.get(CATEGORY_API_ENDPOINT)
      .then((res) => setCategories(res.data))
      .catch(() => setError("Failed to load categories"));
  }, []);

  useEffect(() => {
    if (!formData.category) return;
    axios.get(`${CATEGORY_API_ENDPOINT}/${formData.category}/subcategories`)
      .then((res) => setSubcategories(res.data))
      .catch(() => setError("Failed to load subcategories"));
  }, [formData.category]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
    const urls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const { title, price, category, subcategory } = formData;
    if (!title || !price || !category || !subcategory) {
      setError("Please fill in all required fields.");
      return;
    }

    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => data.append(key, value));
    images.forEach(file => data.append("images", file));

    setLoading(true);
    try {
      const res = await axios.post(PRODUCT_API_ENDPOINT, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        },
        withCredentials: true
      });

      if (res.data.success) {
        navigate("/my-sales");
      } else {
        setError(res.data.message || "Failed to create product.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Server error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Add New Product</h1>
      {error && <div className="text-red-500 mb-4">{error}</div>}

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
                <SelectItem key={cat._id} value={cat._id}>
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
                {subcategories.find(s => s._id === formData.subcategory)?.name || "Select a subcategory"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {subcategories.map((sub) => (
                <SelectItem key={sub._id} value={sub._id}>
                  {sub.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="images">Upload Images</Label>
          <Input id="images" name="images" type="file" multiple accept="image/*" onChange={handleImageChange} />
          <div className="mt-2 flex flex-wrap gap-2">
            {previewUrls.map((url, idx) => (
              <img key={idx} src={url} alt={`preview-${idx}`} className="w-24 h-24 object-cover rounded" />
            ))}
          </div>
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
