import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";
import { CART_API_ENDPOINT, PRODUCT_API_ENDPOINT } from "@/utils/data";
import { useAuthStore } from "./useAuthStore";
import { processCartItem } from "@/utils/productHelpers";

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
          const res = await axios.get(CART_API_ENDPOINT, {
            headers: { Authorization: `Bearer ${token}` }
          });
          // Process cart items to ensure they all have valid product data
          const processedItems = await Promise.all((res.data.items || []).map(async (item) => {
            // If item doesn't have a productId, skip it
            if (!item || !item.productId) {
              console.warn('Invalid cart item without productId:', item);
              return null;
            }
            
            // If product is missing or incomplete, fetch the product directly
            if (!item.product || !item.product.title || !item.product.price) {
              try {
                // Fetch the product directly from the products API
                const productRes = await axios.get(`${PRODUCT_API_ENDPOINT}/${item.productId}`, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                
                const fetchedProduct = productRes.data.product || productRes.data;
                // Use our helper to ensure all fields are processed correctly
                return processCartItem({
                  ...item,
                  product: fetchedProduct
                });
              } catch (err) {
                console.error(`Failed to fetch product ${item.productId}:`, err);
                // If fetch fails, create a placeholder
                return processCartItem({
                  ...item,
                  product: {
                    id: item.productId,
                    title: 'Loading product...',
                    price: parseFloat(item.price || 0),
                    images: []
                  }
                });
              }
            }
            
            // Process the item with our helper
            return processCartItem(item);
          }));
          
          // Remove null items
          const filteredItems = processedItems.filter(Boolean);
          // Check if any product is still loading/missing data
          const hasMissingProducts = filteredItems.some(
            item => !item.product || item.product.title === 'Loading product...'
          );
          
          // Set the items we have for now
          set({ items: filteredItems, loading: false });
          
          // If we have incomplete products, retry after a delay
          if (hasMissingProducts) {
            setTimeout(() => {
              get().fetchCart();
            }, 1000);
          }
        } catch (err) {
          console.error('Error fetching cart:', err);
          set({ error: err.response?.data?.message || "Failed to load cart", loading: false });
        }
      },

      addToCart: async ({ productId, quantity = 1 }) => {
        const { token } = useAuthStore.getState();
        if (!token) {
          console.error('No auth token available');
          throw new Error('You must be logged in to add items to cart');
        }
        
        if (!productId) {
          console.error('No product ID provided');
          throw new Error('Invalid product ID');
        }
        set({ loading: true, error: null });
        
        try {
          const res = await axios.post(
            `${CART_API_ENDPOINT}/add`,
            { productId, quantity },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (!res.data || !res.data.items) {
            console.warn('Unexpected response format:', res.data);
          }
          
          // Process cart items before updating state
          const items = res.data.items || [];
          const processedItems = items.map(item => processCartItem(item));
          
          // Update the state immediately with what we have
          set({ items: processedItems, loading: false });
          
          // After adding, fetch the cart to ensure we have complete data with products
          setTimeout(async () => {
            try {
              await get().fetchCart();
            } catch (error) {
              console.error("Error fetching cart after add:", error);
            }
          }, 300);
          
          return processedItems;
        } catch (err) {
          console.error('Error adding to cart:', err);
          const errorMsg = err.response?.data?.message || "Failed to add to cart";
          set({ error: errorMsg, loading: false });
          throw new Error(errorMsg);
        }
      },

      removeFromCart: async (productId) => {
        const { token } = useAuthStore.getState();
        if (!token) return;
        
        set({ loading: true, error: null });
        try {
          const res = await axios.delete(`${CART_API_ENDPOINT}/remove/${productId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          // Check for cart.items first, then fall back to direct items property
          let updatedItems = res.data.cart?.items || res.data.items || [];
          // Process the items to ensure they have complete product data
          updatedItems = updatedItems.map(item => {
            if (!item || !item.productId) return null;
            
            // If product is missing or incomplete
            if (!item.product || !item.product.title) {
              // Try to find the product from current items
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
          const res = await axios.patch(`${CART_API_ENDPOINT}/decrease/${productId}`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          set({ items: res.data.items || [], loading: false });
        } catch (err) {
          set({ error: err.response?.data?.message || "Failed to update cart", loading: false });
        }
      },

      clearCart: async () => {
        const { token } = useAuthStore.getState();
        if (!token) return;
        
        set({ loading: true, error: null });
        try {
          const res = await axios.delete(`${CART_API_ENDPOINT}/clear`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          // Check for cart.items first, then fall back to direct items property
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

