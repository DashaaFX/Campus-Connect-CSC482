import React from 'react';
import { Button } from '../components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';

const categoryMap = {
  academic: ['textbooks', 'lab_manuals', 'solution_guides', 'lecture_notes', 'exam_papers', 'study_guides', 'research_papers'],
  electronics: ['laptops', 'calculators', 'tablets', 'headphones', 'chargers'],
  dorm: ['minifridges', 'bedding', 'storage', 'lighting'],
  clothing: ['formal_wear', 'winter_gear', 'university_merch', 'bags', 'footwear'],
  supplies: ['notebooks', 'pens', 'stationery', 'printer_supplies'],
  sports: ['yoga_mats', 'bikes', 'sports_gear'],
  miscellaneous: ['appliances', 'games', 'suitcases', 'art_supplies']
};

const AdminSidebar = ({ onCategorySelect, onSubcategorySelect, selectedCategory, selectedSubcategory }) => {
  const [openCategories, setOpenCategories] = React.useState([]);

  const toggleCategory = (category) => {
    setOpenCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
  };

  return (
    <div className="w-64 border-r p-4">
      <h2 className="text-lg font-semibold mb-4">Categories</h2>
      
      <Button 
        variant="ghost" 
        className={`w-full justify-start mb-2 ${!selectedCategory ? 'bg-accent' : ''}`}
        onClick={() => onCategorySelect(null)}
      >
        All Products
      </Button>

      {Object.keys(categoryMap).map((category) => (
        <Collapsible 
          key={category}
          open={openCategories.includes(category)}
          onOpenChange={() => toggleCategory(category)}
          className="mb-2"
        >
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className={`w-full justify-between ${selectedCategory === category ? 'bg-accent' : ''}`}
            >
              <span className="capitalize">{category.replace(/_/g, ' ')}</span>
              {openCategories.includes(category) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 mt-1 space-y-1">
            {categoryMap[category].map((subcategory) => (
              <Button
                key={subcategory}
                variant="ghost"
                className={`w-full justify-start text-sm ${selectedSubcategory === subcategory ? 'bg-accent' : ''}`}
                onClick={() => {
                  onCategorySelect(category);
                  onSubcategorySelect(subcategory);
                }}
              >
                {subcategory.replace(/_/g, ' ')}
              </Button>
            ))}
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
};

export default AdminSidebar;