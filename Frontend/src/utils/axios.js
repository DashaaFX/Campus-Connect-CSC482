import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false // Ensure credentials aren't sent for CORS
});

// Function to get token from persisted auth storage
const getAuthToken = () => {
  try {
    // Try the auth-storage format 
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      const token = parsed.state?.token || parsed.token;
      
      if (token) {
        return token;
      }
    }
    
    // Fallback to old token storage
    const legacyToken = localStorage.getItem('token');
    if (legacyToken) {
      return legacyToken;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return localStorage.getItem('token'); 
  }
};

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const url = config.url || '';
    // Only skip auth header for direct S3/object store style URLs, NOT all amazonaws.com (API Gateway needs token)
    const isS3Like = /s3[.-].*\.amazonaws\.com|\.s3\.amazonaws\.com/.test(url) || url.includes('presigned') || url.includes('upload') && url.includes('amazonaws.com');
    if (!isS3Like) {
      const token = getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !(error.config?.url || '').includes('/upload')) {
      localStorage.removeItem('token');
      localStorage.removeItem('auth-storage');
      //window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

