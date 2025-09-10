import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { CATEGORY_API_ENDPOINT } from '@/utils/data';


const CategoryContext = createContext();


export function CategoryProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await axios.get(CATEGORY_API_ENDPOINT);
        const categoriesData = data.categories || [];
        setCategories(categoriesData);
        // Cache in localStorage
        localStorage.setItem('categories', JSON.stringify(categoriesData));
      } catch (err) {
        console.error('Failed to load categories', err);
        // Fallback to cache if available
        const cached = localStorage.getItem('categories');
        if (cached) setCategories(JSON.parse(cached));
      } finally {
        setLoading(false);
      }
    };


    fetchCategories();
  }, []);


  const getCategoryAttributes = (categorySlug, subcategorySlug) => {
    const category = categories.find(c => c.slug === categorySlug);
    if (!category) return null;
   
    const subcategory = category.subcategories.find(s => s.slug === subcategorySlug);
    return subcategory?.attributes || [];
  };


  return (
    <CategoryContext.Provider value={{ categories, loading, getCategoryAttributes }}>
      {children}
    </CategoryContext.Provider>
  );
}


export const useCategories = () => useContext(CategoryContext);

