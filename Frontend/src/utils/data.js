const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://f6ae6g3h2f.execute-api.us-east-1.amazonaws.com/dev2";

export const USER_API_ENDPOINT = `${API_BASE_URL}/auth`;
export const PRODUCT_API_ENDPOINT = `${API_BASE_URL}/products`;
export const CATEGORY_API_ENDPOINT = `${API_BASE_URL}/categories`;
export const CART_API_ENDPOINT = `${API_BASE_URL}/cart`;
export const ORDER_API_ENDPOINT = `${API_BASE_URL}/orders`;
export const UPLOAD_API_ENDPOINT = `${API_BASE_URL}/upload`;
export const ADMIN_API_ENDPOINT = `${API_BASE_URL}/admin`;
