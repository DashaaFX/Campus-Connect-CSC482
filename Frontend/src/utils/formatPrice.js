
export const formatPrice = (price, decimals = 2) => {
  const numPrice = Number(price || 0);
  if (isNaN(numPrice)) {
    return '0.00';
  }
  return numPrice.toFixed(decimals);
};

export const parsePrice = (price) => {
  const numPrice = Number(price || 0);
  return isNaN(numPrice) ? 0 : numPrice;
};

