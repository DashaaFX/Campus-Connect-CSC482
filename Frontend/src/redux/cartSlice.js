// src/redux/cartSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '@/utils/axios';
import { CART_API_ENDPOINT } from '@/utils/data';

// Async Thunks
export const fetchCart = createAsyncThunk('cart/fetchCart', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get(CART_API_ENDPOINT);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load cart');
  }
});

export const addToCart = createAsyncThunk('cart/addToCart', async ({ productId, quantity = 1 }, { rejectWithValue }) => {
  try {
    const res = await api.post(`${CART_API_ENDPOINT}/add`, { productId, quantity });
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to add to cart');
  }
});

export const removeFromCart = createAsyncThunk('cart/removeFromCart', async (productId, { rejectWithValue }) => {
  try {
    const res = await api.delete(`${CART_API_ENDPOINT}/remove/${productId}`);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to remove from cart');
  }
});
export const decreaseQuantityFromCart = createAsyncThunk(
  'cart/decreaseQuantity',
  async (productId, { rejectWithValue }) => {
    try {
      const res = await api.patch(`${CART_API_ENDPOINT}/decrease/${productId}`, {});
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update cart');
    }
  }
);

export const clearCart = createAsyncThunk('cart/clearCart', async (_, { rejectWithValue }) => {
  try {
    const res = await api.delete(`${CART_API_ENDPOINT}/clear`);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to clear cart');
  }
});

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: [],
    user: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.items = action.payload.items || [];
        state.user = action.payload.user;
        state.loading = false;
      })
      .addMatcher(action => action.type.endsWith('/pending'), state => {
        state.loading = true;
        state.error = null;
      })
      .addMatcher(action => action.type.endsWith('/rejected'), (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addMatcher(action => action.type.endsWith('/fulfilled'), state => {
        state.loading = false;
        state.error = null;
      });
  },
});

export default cartSlice.reducer;
