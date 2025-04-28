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
    const fetchCategories = async () => {
      const res = await axios.get(CATEGORY_API_ENDPOINT);
      setCategories(res.data);

      const subMap = {};
      for (const cat of res.data) {
        const subRes = await axios.get(`${CATEGORY_API_ENDPOINT}/${cat._id}/subcategories`);
        subMap[cat._id] = subRes.data;
      }
      setSubcategoriesMap(subMap);
    };

    fetchCategories();
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
<<<<<<< HEAD
      <h2 className="text-lg font-semibold mb-4">Categories</h2>
=======
      <h2 className="text-lg font-semibold mb-4 sticky top-0 z-60">Categories</h2>
>>>>>>> dash3

      <Button
        variant="ghost"
        className={`w-full justify-start mb-2 ${!selectedCategory ? 'bg-accent' : ''}`}
        onClick={() => onCategorySelect(null)}
      >
        All Products
      </Button>

      {categories.map(category => (
        <Collapsible
          key={category._id}
          open={openCategories.includes(category._id)}
          onOpenChange={() => toggleCategory(category._id)}
          className="mb-2"
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className={`w-full justify-between ${selectedCategory === category._id ? 'bg-accent' : ''}`}
            >
              <span className="capitalize">{category.name.replace(/_/g, ' ')}</span>
              {openCategories.includes(category._id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 mt-1 space-y-1">
            {(subcategoriesMap[category._id] || []).map(sub => (
              <Button
                key={sub._id}
                variant="ghost"
                className={`w-full justify-start text-sm ${selectedSubcategory === sub._id ? 'bg-accent' : ''}`}
                onClick={() => {
                  onCategorySelect(category._id);
                  onSubcategorySelect(sub._id);
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
