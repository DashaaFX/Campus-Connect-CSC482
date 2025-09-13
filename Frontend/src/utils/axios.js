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
    // Try the auth-storage format (Zustand persist)
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
    
    console.warn('No auth token found in any storage!');
    return null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return localStorage.getItem('token'); // Final fallback
  }
};

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    // Skip adding auth headers for S3 upload URLs
    if (config.url && (
      config.url.includes('amazonaws.com') || 
      config.url.includes('s3.') ||
      // If withCredentials is explicitly set to false, don't add auth headers
      config.withCredentials === false
    )) {
      return config;
    }

    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
    if (error.response?.status === 401) {
      if (!error.config?.url?.includes('/upload')) {
        localStorage.removeItem('token');
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

