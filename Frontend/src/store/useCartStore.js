import { create } from "zustand";
import { persist } from "zustand/middleware";
<<<<<<< HEAD
import axios from "axios";
import  { CART_API_ENDPOINT, PRODUCT_API_ENDPOINT } from "@/utils/data";
=======
import api from "@/utils/axios";
import { CART_API_ENDPOINT, PRODUCT_API_ENDPOINT } from "@/utils/data";
>>>>>>> e845458571f7fce87cec8c79a7cc936ad8c05c14
import { useAuthStore } from "./useAuthStore";

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      loading: false,
      error: null,

      fetchCart: async () => {
        const { token } = useAuthStore.getState();
        if (!token) return;
        set({ loading: true, error: null });
        try {
          const res = await api.get(CART_API_ENDPOINT, {
            headers: { Authorization: `Bearer ${token}` }
          });
<<<<<<< HEAD

          // Handle different possible response formats
          const cartItems = res.data.cart?.items || res.data.items || [];
          
          // Always fetch latest product data for each item to ensure stock is current
          const processedItems = await Promise.all(cartItems.map(async (item) => {
=======
          const processedItems = await Promise.all((res.data.items || []).map(async (item) => {
>>>>>>> e845458571f7fce87cec8c79a7cc936ad8c05c14
            if (!item || !item.productId) {
              return null;
            }
<<<<<<< HEAD
            
            try {
              // Always fetch fresh product data to get current stock
              const productRes = await axios.get(`${PRODUCT_API_ENDPOINT}/${item.productId}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              
              const fetchedProduct = productRes.data.product || productRes.data;
              
              // Check if product still exists and has stock
              if (!fetchedProduct) {
                return {
=======
            if (!item.product || !item.product.title || !item.product.price) {
              try {
                const productRes = await api.get(`${PRODUCT_API_ENDPOINT}/${item.productId}`, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                const fetchedProduct = productRes.data.product || productRes.data;
                return processCartItem({
                  ...item,
                  product: fetchedProduct
                });
              } catch (err) {
                console.error(`Failed to fetch product ${item.productId}:`, err);
                return processCartItem({
>>>>>>> e845458571f7fce87cec8c79a7cc936ad8c05c14
                  ...item,
                  product: {
                    id: item.productId,
                    title: 'Product not found',
                    price: parseFloat(item.price || 0),
                    images: [],
                    stock: 0
                  }
                };
              }
              
              return {
                ...item,
                product: {
                  ...fetchedProduct,
                  stock: parseInt(fetchedProduct.stock || 0) // Ensure stock is a number
                }
              };
            } catch (err) {
              // Return placeholder with the data we have
              return {
                ...item,
                product: {
                  id: item.productId,
                  title: 'Error loading product',
                  price: parseFloat(item.price || 0),
                  images: [],
                  stock: 0
                }
              };
            }
<<<<<<< HEAD
          }));
          
          const filteredItems = processedItems.filter(Boolean);
          set({ items: filteredItems, loading: false });
=======
            return processCartItem(item);
          }));
          const filteredItems = processedItems.filter(Boolean);
          const hasMissingProducts = filteredItems.some(
            item => !item.product || item.product.title === 'Loading product...'
          );
          set({ items: filteredItems, loading: false });
          if (hasMissingProducts) {
            setTimeout(() => {
              get().fetchCart();
            }, 1000);
          }
>>>>>>> e845458571f7fce87cec8c79a7cc936ad8c05c14
        } catch (err) {
          console.error('Error fetching cart:', err);
          set({ error: err.response?.data?.message || "Failed to load cart", loading: false });
        }
      },

      addToCart: async ({ productId, quantity = 1 }) => {
        const { token } = useAuthStore.getState();
<<<<<<< HEAD
        if (!token) {
          console.error('No auth token available');
          set({ loading: false, error: 'You must be logged in to add items to cart' });
          return { success: false, error: 'You must be logged in to add items to cart' };
        }
        
        if (!productId) {
          console.error('No product ID provided');
          set({ loading: false, error: 'Invalid product ID' });
          return { success: false, error: 'Invalid product ID' };
        }
        
        set({ loading: true, error: null });
        
        try {
          // First check if product has enough stock - use cache: 'no-store' to ensure we get the latest stock data
          const productRes = await axios.get(`${PRODUCT_API_ENDPOINT}/${productId}`, {
            headers: { 
              Authorization: `Bearer ${token}`,
              // Force cache bypass to ensure latest stock info
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          
          const product = productRes.data.product || productRes.data;
          const availableStock = parseInt(product?.stock || 0);
          
          // Check for existing quantity in cart
          const currentItems = get().items;
          const existingItem = currentItems.find(item => item.productId === productId);
          const existingQuantity = existingItem ? parseInt(existingItem.quantity || 0) : 0;
          const totalRequestedQuantity = existingQuantity + quantity;
          
          if (availableStock < totalRequestedQuantity) {
            const errorMsg = `Sorry, you can't add ${quantity} more. Only ${availableStock} items in stock total.`;
            set({ loading: false, error: errorMsg });
            return { success: false, error: errorMsg };
          }
          
          const res = await axios.post(
            `${CART_API_ENDPOINT}/add`,
            { productId, quantity },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          // Handle reverted response format
          const items = res.data.cart?.items || [];
          set({ items, loading: false });
          return { success: true };
        } catch (err) {
          console.error('Error adding to cart:', err);
          const errorMsg = err.response?.data?.message || "Failed to add item to cart";
          set({ error: errorMsg, loading: false });
          return { success: false, error: errorMsg };
=======
        if (!token) return;
        // Optimistically update cart state
        set((state) => {
          const existing = state.items.find(item => item.productId === productId);
          if (existing) {
            return {
              items: state.items.map(item =>
                item.productId === productId
                  ? { ...item, quantity: (item.quantity || 0) + quantity }
                  : item
              )
            };
          } else {
            return {
              items: [
                ...state.items,
                { productId, quantity, product: { title: 'Loading product...' } }
              ]
            };
          }
        });
        try {
          await api.post(`${CART_API_ENDPOINT}/add`, { productId, quantity }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          // Re-fetch cart to sync with backend
          await get().fetchCart();
        } catch (err) {
          // Revert optimistic update on error
          await get().fetchCart();
>>>>>>> e845458571f7fce87cec8c79a7cc936ad8c05c14
        }
      },

      removeFromCart: async (productId) => {
        const { token } = useAuthStore.getState();
<<<<<<< HEAD
        if (!token) return { success: false };
        set({ loading: true, error: null });
        
        // Get the current quantity for this product
        const currentItems = get().items;
        const item = currentItems.find(i => i.productId === productId);
        
        if (!item) return { success: false };
        
        const currentQuantity = parseInt(item.quantity || 1);
        
        // If quantity is greater than 1, decrease instead of removing
        if (currentQuantity > 1) {
          try {
            // Update cart item quantity using the API
            const res = await axios.put(`${CART_API_ENDPOINT}/${productId}`, {
              quantity: currentQuantity - 1
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            const updatedItems = res.data.cart?.items || [];
            set({ items: updatedItems, loading: false });
            return { success: true };
          } catch (err) {
            set({ error: "Failed to update cart", loading: false });
            return { success: false };
          }
        } else {
          // Remove the item completely if quantity is 1
          try {
            const res = await axios.delete(`${CART_API_ENDPOINT}/remove/${productId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const updatedItems = res.data.cart?.items || res.data.items || [];
            set({ items: updatedItems, loading: false });
            return { success: true };
          } catch (err) {
            set({ error: "Failed to remove from cart", loading: false });
            return { success: false };
          }
=======
        if (!token) return;
        set({ loading: true, error: null });
        try {
          const res = await api.delete(`${CART_API_ENDPOINT}/remove/${productId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          let updatedItems = res.data.cart?.items || res.data.items || [];
          updatedItems = updatedItems.map(item => {
            if (!item || !item.productId) return null;
            if (!item.product || !item.product.title) {
              const currentItems = get().items;
              const existingItem = currentItems.find(i => i.productId === item.productId);
              const existingProduct = existingItem?.product;
              return {
                ...item,
                product: existingProduct || {
                  id: item.productId,
                  title: 'Loading product...',
                  price: parseFloat(item.price || 0)
                }
              };
            }
            return item;
          }).filter(Boolean);
          set({ items: updatedItems, loading: false });
        } catch (err) {
          console.error('Error removing item from cart:', err);
          set({ error: err.response?.data?.message || "Failed to remove from cart", loading: false });
        }
      },

      decreaseQuantity: async (productId) => {
        const { token } = useAuthStore.getState();
        if (!token) return;
        set({ loading: true, error: null });
        try {
          const res = await api.patch(`${CART_API_ENDPOINT}/decrease/${productId}`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          set({ items: res.data.items || [], loading: false });
        } catch (err) {
          set({ error: err.response?.data?.message || "Failed to update cart", loading: false });
>>>>>>> e845458571f7fce87cec8c79a7cc936ad8c05c14
        }
      },

      clearCart: async () => {
        const { token } = useAuthStore.getState();
        if (!token) return;
        set({ loading: true, error: null });
        try {
          const res = await api.delete(`${CART_API_ENDPOINT}/clear`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const updatedItems = res.data.cart?.items || res.data.items || [];
          set({ items: updatedItems, loading: false });
        } catch (err) {
          console.error('Error clearing cart:', err);
          set({ error: err.response?.data?.message || "Failed to clear cart", loading: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "cart-storage",
      partialize: (state) => ({ items: state.items }),
    }
  )
);

