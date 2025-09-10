import { useState, useEffect } from 'react';
import { useCategories } from '../context/CategoryContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';


export default function ProductForm() {
  const { categories, loading } = useCategories();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    subcategory: '',
    condition: 'used',
    images: [],
    attributes: {}
  });
  const [subcategories, setSubcategories] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);


  // Get attributes for selected subcategory
  const getCategoryAttributes = (categorySlug, subcategorySlug) => {
    const category = categories.find(c => c.slug === categorySlug);
    if (!category) return [];
    const subcategory = category.subcategories.find(s => s.slug === subcategorySlug);
    return subcategory?.attributes || [];
  };


  // Update form data helpers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };


  const updateAttribute = (attrName, value) => {
    setFormData(prev => ({
      ...prev,
      attributes: { ...prev.attributes, [attrName]: value }
    }));
  };


  // Handle image uploads
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({ ...prev, images: files }));
   
    // Create previews
    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(previews);
  };


  // Update subcategories when category changes
  useEffect(() => {
    if (formData.category) {
      const selected = categories.find(c => c.slug === formData.category);
      setSubcategories(selected?.subcategories || []);
      setFormData(prev => ({ ...prev, subcategory: '', attributes: {} }));
    }
  }, [formData.category, categories]);


  // Update attributes when subcategory changes
  useEffect(() => {
    if (formData.category && formData.subcategory) {
      const attrs = getCategoryAttributes(formData.category, formData.subcategory);
      setAttributes(attrs);
     
      // Initialize attributes
      const initialAttrs = {};
      attrs.forEach(attr => {
        initialAttrs[attr.name] = attr.type === 'select' ? '' :
                               attr.type === 'number' ? 0 : '';
      });
      setFormData(prev => ({ ...prev, attributes: initialAttrs }));
    }
  }, [formData.subcategory]);


  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const categoryObj = categories.find(c => c.slug === formData.category);
      const subcategoryObj = categoryObj?.subcategories.find(s => s.slug === formData.subcategory);


      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('price', formData.price);
      formDataToSend.append('category', categoryObj._id);
      formDataToSend.append('subcategory', subcategoryObj._id);
      formDataToSend.append('condition', formData.condition);
      formDataToSend.append('attributes', JSON.stringify(formData.attributes));
     
      // Append images
      formData.images.forEach((image) => {
        formDataToSend.append('images', image);
      });


      await axios.post('/api/products', formDataToSend, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });
     
      navigate('/products'); // Redirect after success
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create product');
    }
  };


  if (loading) return <div className="text-center py-8">Loading categories...</div>;


  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">List a New Product</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-2">
          <label className="block font-medium">Title*</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>


        <div className="space-y-2">
          <label className="block font-medium">Description*</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full p-2 border rounded min-h-[100px]"
            required
          />
        </div>


        <div className="space-y-2">
          <label className="block font-medium">Price*</label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            min="0"
            step="0.01"
            required
          />
        </div>


        {/* Category Selection */}
        <div className="space-y-2">
          <label className="block font-medium">Category*</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          >
            <option value="">Select Category</option>
            {categories.map(category => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>


        {/* Subcategory Selection */}
        {formData.category && (
          <div className="space-y-2">
            <label className="block font-medium">Subcategory*</label>
            <select
              name="subcategory"
              value={formData.subcategory}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select Subcategory</option>
              {subcategories.map(sub => (
                <option key={sub.slug} value={sub.slug}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>
        )}


        {/* Condition */}
        <div className="space-y-2">
          <label className="block font-medium">Condition*</label>
          <select
            name="condition"
            value={formData.condition}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          >
            <option value="used">Used</option>
            <option value="new">New</option>
            <option value="refurbished">Refurbished</option>
          </select>
        </div>


        {/* Images */}
        <div className="space-y-2">
          <label className="block font-medium">Images*</label>
          <input
            type="file"
            multiple
            onChange={handleImageChange}
            className="w-full p-2 border rounded"
            accept="image/*"
            required
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {imagePreviews.map((preview, index) => (
              <img
                key={index}
                src={preview}
                alt={`Preview ${index}`}
                className="h-20 w-20 object-cover rounded"
              />
            ))}
          </div>
        </div>


        {/* Dynamic Attributes */}
        {attributes.length > 0 && (
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium text-lg">Additional Details</h3>
            {attributes.map(attr => (
              <div key={attr.name} className="space-y-2">
                <label className="block">
                  {attr.name}
                  {!attr.required && <span className="text-gray-500 ml-1">(optional)</span>}
                </label>
               
                {attr.type === 'select' ? (
                  <select
                    value={formData.attributes[attr.name] || ''}
                    onChange={(e) => updateAttribute(attr.name, e.target.value)}
                    className="w-full p-2 border rounded"
                    required={attr.required}
                  >
                    <option value="">Select {attr.name}</option>
                    {attr.options?.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                    {!attr.required && <option value="unknown">Don't know</option>}
                  </select>
                ) : (
                  <input
                    type={attr.type}
                    value={formData.attributes[attr.name] || ''}
                    onChange={(e) => updateAttribute(attr.name, e.target.value)}
                    className="w-full p-2 border rounded"
                    required={attr.required}
                    placeholder={!attr.required ? "Leave blank if unknown" : ""}
                    min={attr.type === 'number' ? 0 : undefined}
                  />
                )}
              </div>
            ))}
          </div>
        )}


        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
        >
          List Product
        </button>
      </form>
    </div>
  );
}

