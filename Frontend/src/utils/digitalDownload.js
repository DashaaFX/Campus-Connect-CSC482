// Utility to request a secure download URL for a digital product
import api from './axios';
import { PRODUCT_API_ENDPOINT } from './data';

export const fetchDigitalDownloadUrl = async (productId) => {
  if (!productId) throw new Error('productId required');
  const res = await api.get(`${PRODUCT_API_ENDPOINT}/${productId}/download`);
  return res.data?.data?.url || res.data?.url || res.data?.data?.downloadUrl || null;
};
