// Updated AdminSidebar.jsx to load categories and subcategories dynamically
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { CATEGORY_API_ENDPOINT } from '@/utils/data';

const AdminSidebar = ({ onCategorySelect, onSubcategorySelect, selectedCategory, selectedSubcategory }) => {
  const [openCategories, setOpenCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategoriesMap, setSubcategoriesMap] = useState({});

  useEffect(() => {
    let mounted = true;
    
    const fetchCategories = async () => {
      try {
        const res = await axios.get(CATEGORY_API_ENDPOINT);
        if (!mounted) return;
        
        console.log('Categories API response:', res.data);
        const categoriesData = res.data.categories || [];
        setCategories(categoriesData);

        const subMap = {};
        for (const cat of categoriesData) {
          if (!mounted) break;
          
          try {
            const catId = cat.id || cat._id;
            const subRes = await axios.get(`${CATEGORY_API_ENDPOINT}/${catId}/subcategories`);
            
            if (!mounted) break;
            
            console.log('Subcategories API response:', subRes.data);
            // Handle both formats: direct array or nested in data property
            const subcategoriesData = Array.isArray(subRes.data) ? subRes.data : (subRes.data.data || subRes.data.subcategories || []);
            subMap[catId] = subcategoriesData;
          } catch (err) {
            console.error(`Failed to load subcategories for ${cat.id || cat._id}:`, err);
            subMap[cat.id || cat._id] = [];
          }
        }
        
        if (mounted) {
          setSubcategoriesMap(subMap);
        }
      } catch (err) {
        if (mounted) {
          console.error('Failed to load categories:', err);
          setCategories([]);
        }
      }
    };

    fetchCategories();
    
    return () => {
      mounted = false;
    };
  }, []);

  const toggleCategory = (categoryId) => {
    setOpenCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <div className="w-64 border-r p-4">
      <h2 className="text-lg font-semibold mb-4 sticky top-0 z-60">Categories</h2>

      <Button
        variant="ghost"
        className={`w-full justify-start mb-2 ${!selectedCategory ? 'bg-accent' : ''}`}
        onClick={() => onCategorySelect(null)}
      >
        All Products
      </Button>

      {categories.map(category => (
        <Collapsible
          key={category.id || category._id}
          open={openCategories.includes(category.id || category._id)}
          onOpenChange={() => toggleCategory(category.id || category._id)}
          className="mb-2"
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className={`w-full justify-between ${selectedCategory === (category.id || category._id) ? 'bg-accent' : ''}`}
            >
              <span className="capitalize">{category.name.replace(/_/g, ' ')}</span>
              {openCategories.includes(category.id || category._id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 mt-1 space-y-1">
            {(subcategoriesMap[category.id || category._id] || []).map(sub => (
              <Button
                key={sub.id || sub._id}
                variant="ghost"
                className={`w-full justify-start text-sm ${selectedSubcategory === (sub.id || sub._id) ? 'bg-accent' : ''}`}
                onClick={() => {
                  onCategorySelect(category.id || category._id);
                  onSubcategorySelect(sub.id || sub._id);
                }}
              >
                {sub.name.replace(/_/g, ' ')}
              </Button>
            ))}
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
};

export default AdminSidebar;
