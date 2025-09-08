/**
 * Safely format price values that might come from DynamoDB as strings or numbers
 * @param {string|number} price - The price value to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} - Formatted price string
 */
export const formatPrice = (price, decimals = 2) => {
  const numPrice = Number(price || 0);
  if (isNaN(numPrice)) {
    return '0.00';
  }
  return numPrice.toFixed(decimals);
};

/**
 * Parse price value to ensure it's a valid number
 * @param {string|number} price - The price value to parse
 * @returns {number} - Parsed price as number
 */
export const parsePrice = (price) => {
  const numPrice = Number(price || 0);
  return isNaN(numPrice) ? 0 : numPrice;
};
