import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, AlertCircle } from 'lucide-react';
import axios from '../../utils/axios';
import { useAuthStore } from '../../store/useAuthStore';

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form states
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showSubcategoryForm, setShowSubcategoryForm] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [subcategoryForm, setSubcategoryForm] = useState({ name: '', categoryId: '', description: '' });
  
  const { token } = useAuthStore();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load categories (public endpoint) and all subcategories
      const categoriesRes = await axios.get('/categories');
      setCategories(categoriesRes.data.categories || []);
      
      // Load all subcategories - we'll use a different approach since we need all
      const allSubcategories = [];
      for (const category of categoriesRes.data.categories || []) {
        try {
          const subRes = await axios.get(`/categories/${category.id}/subcategories`);
          const subs = Array.isArray(subRes.data) ? subRes.data : (subRes.data.data || subRes.data.subcategories || []);
          allSubcategories.push(...subs);
        } catch (err) {
          console.log(`No subcategories for ${category.id}:`, err.message);
        }
      }
      setSubcategories(allSubcategories);
      
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      
      await axios.post('/admin/categories', categoryForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Category created successfully!');
      setCategoryForm({ name: '', description: '' });
      setShowCategoryForm(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const createSubcategory = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      
      await axios.post('/admin/subcategories', subcategoryForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Subcategory created successfully!');
      setSubcategoryForm({ name: '', categoryId: '', description: '' });
      setShowSubcategoryForm(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create subcategory');
    } finally {
      setLoading(false);
    }
  };

  const cleanDuplicates = async (table) => {
    if (!confirm(`Are you sure you want to clean duplicates from ${table}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.delete(`/admin/clean-duplicates?table=${table}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess(`Removed ${response.data.duplicatesRemoved} duplicates from ${table}`);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to clean duplicates');
    } finally {
      setLoading(false);
    }
  };

  const getSubcategoriesForCategory = (categoryId) => {
    return subcategories.filter(sub => sub.categoryId === categoryId);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Category Management</h1>
        
        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <span className="text-green-700">{success}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={() => setShowCategoryForm(!showCategoryForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </button>
          
          <button
            onClick={() => setShowSubcategoryForm(!showSubcategoryForm)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Subcategory
          </button>
          
          <button
            onClick={() => cleanDuplicates('categories')}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center"
            disabled={loading}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clean Category Duplicates
          </button>
          
          <button
            onClick={() => cleanDuplicates('subcategories')}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center"
            disabled={loading}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clean Subcategory Duplicates
          </button>
        </div>

        {/* Category Form */}
        {showCategoryForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-md">
            <h3 className="text-lg font-semibold mb-4">Create New Category</h3>
            <form onSubmit={createCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Create Category
                </button>
                <button
                  type="button"
                  onClick={() => setShowCategoryForm(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Subcategory Form */}
        {showSubcategoryForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-md">
            <h3 className="text-lg font-semibold mb-4">Create New Subcategory</h3>
            <form onSubmit={createSubcategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Category
                </label>
                <select
                  value={subcategoryForm.categoryId}
                  onChange={(e) => setSubcategoryForm({...subcategoryForm, categoryId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subcategory Name
                </label>
                <input
                  type="text"
                  value={subcategoryForm.name}
                  onChange={(e) => setSubcategoryForm({...subcategoryForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={subcategoryForm.description}
                  onChange={(e) => setSubcategoryForm({...subcategoryForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading || !subcategoryForm.categoryId}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  Create Subcategory
                </button>
                <button
                  type="button"
                  onClick={() => setShowSubcategoryForm(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Categories List */}
        <div className="space-y-6">
          {loading && <div className="text-center">Loading...</div>}
          
          {categories.map(category => (
            <div key={category.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-semibold">{category.name}</h3>
                  <p className="text-gray-600">{category.description}</p>
                  <p className="text-sm text-gray-500">ID: {category.id}</p>
                </div>
              </div>
              
              {/* Subcategories */}
              <div className="mt-4">
                <h4 className="font-medium text-gray-700 mb-2">Subcategories:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {getSubcategoriesForCategory(category.id).map(subcategory => (
                    <div key={subcategory.id} className="bg-gray-50 p-3 rounded border">
                      <div className="font-medium">{subcategory.name}</div>
                      <div className="text-sm text-gray-600">{subcategory.description}</div>
                      <div className="text-xs text-gray-500">ID: {subcategory.id}</div>
                    </div>
                  ))}
                </div>
                {getSubcategoriesForCategory(category.id).length === 0 && (
                  <p className="text-gray-500 italic">No subcategories</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryManagement;
