
export const formatSubcategory = (subcategory) => {
  if (!subcategory) return 'Not specified';
  
  if (typeof subcategory === 'object' && subcategory !== null) {
    return subcategory.name || 'Unnamed subcategory';
  }
  
  if (typeof subcategory === 'string') {
    // If it's just an ID, we'll show a placeholder until backend populates it
    return subcategory.includes('-') || subcategory.length > 20 
      ? 'Loading subcategory...' 
      : subcategory;
  }
  
  return 'Not specified';
};

