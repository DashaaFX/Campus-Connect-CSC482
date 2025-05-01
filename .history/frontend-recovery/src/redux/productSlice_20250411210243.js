import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { PRODUCT_API_ENDPOINT } from "@/utils/data";

// Async Thunks
const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(PRODUCT_API_ENDPOINT);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch products');
    }
  }
);

const fetchProductById = createAsyncThunk(
  'products/fetchProductById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${PRODUCT_API_ENDPOINT}/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch product');
    }
  }
);

const createNewProduct = createAsyncThunk(
  'products/createNewProduct',
  async ({ formData, token }, { rejectWithValue }) => {
    try {
      const response = await axios.post(PRODUCT_API_ENDPOINT, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 
        error.response?.data?.error || 
        'Failed to create product'
      );
    }
  }
);

const updateExistingProduct = createAsyncThunk(
  'products/updateExistingProduct',
  async ({ id, productData }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${PRODUCT_API_ENDPOINT}/${id}`, productData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update product');
    }
  }
);

const deleteProduct = createAsyncThunk(
  'products/deleteProduct',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${PRODUCT_API_ENDPOINT}/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete product');
    }
  }
);

const updateProductStock = createAsyncThunk(
  'products/updateProductStock',
  async ({ id, quantity }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`${PRODUCT_API_ENDPOINT}/${id}/stock`, { quantity });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update stock');
    }
  }
);

const productSlice = createSlice({
  name: 'products',
  initialState: {
    products: [],
    product: null,
    loading: false,
    error: null,
    total: 0,
    totalPages: 1,
    currentPage: 1,
  },
  reducers: {
    clearProductState: (state) => {
      state.product = null;
      state.error = null;
    },
    resetProductError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // First handle all specific fulfilled cases
    builder
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload.data || [];
        state.total = action.payload.total || 0;
        state.totalPages = action.payload.totalPages || 1;
        state.currentPage = action.payload.currentPage || 1;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.loading = false;
        state.product = action.payload;
      })
      .addCase(createNewProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.products.unshift(action.payload);
        state.product = action.payload;
      })
      .addCase(updateExistingProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.product = action.payload;
        state.products = state.products.map(product => 
          product._id === action.payload._id ? action.payload : product
        );
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.products = state.products.filter(product => product._id !== action.payload);
        if (state.product?._id === action.payload) {
          state.product = null;
        }
      })
      .addCase(updateProductStock.fulfilled, (state, action) => {
        state.loading = false;
        state.product = action.payload;
        state.products = state.products.map(product => 
          product._id === action.payload._id ? action.payload : product
        );
      });

    // Then handle pending and rejected states with matchers
    builder
      .addMatcher(
        (action) => action.type.endsWith('/pending'),
        (state) => {
          state.loading = true;
          state.error = null;
        }
      )
      .addMatcher(
        (action) => action.type.endsWith('/rejected'),
        (state, action) => {
          state.loading = false;
          state.error = action.payload || 'An error occurred';
        }
      );
  },
});

export const { clearProductState, resetProductError } = productSlice.actions;

// Export all async thunks as named exports
export {
  fetchProducts,
  fetchProductById,
  createNewProduct,
  updateExistingProduct,
  deleteProduct,
  updateProductStock
};

export default productSlice.reducer;