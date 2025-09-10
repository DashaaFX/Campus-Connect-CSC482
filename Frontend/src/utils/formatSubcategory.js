/**
 * Formats a subcategory value for display, handling different data structures
 * @param {*} subcategory - The subcategory value (can be string ID, object, or null)
 * @returns {string} Formatted subcategory name for display
 */
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

