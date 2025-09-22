import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";
import { CART_API_ENDPOINT, PRODUCT_API_ENDPOINT } from "@/utils/data";
import { useAuthStore } from "./useAuthStore";
import { processCartItem } from "@/utils/productHelpers";

// For debugging - let's log the endpoint
console.log("CART_API_ENDPOINT:", CART_API_ENDPOINT);

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

          // Handle reverted response format
          const cartItems = res.data.cart?.items || [];
          
          const processedItems = await Promise.all(cartItems.map(async (item) => {
            if (!item || !item.productId) {
              console.warn('Invalid cart item without productId:', item);
              return null;
            }
            if (!item.product || !item.product.title || !item.product.price) {
              try {
                const productRes = await axios.get(`${PRODUCT_API_ENDPOINT}/${item.productId}`, {
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
            return processCartItem(item);
          }));
          const filteredItems = processedItems.filter(Boolean);
          set({ items: filteredItems, loading: false });
          
          // Check if any products are still loading and retry fetching them
          const hasMissingProducts = filteredItems.some(
            item => !item.product || item.product.title === 'Loading product...'
          );
          if (hasMissingProducts) {
            setTimeout(() => {
              get().fetchCart();
            }, 1000);
          }
        } catch (err) {
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
        
        // First, check if product has enough stock before adding to cart
        try {
          const productRes = await axios.get(`${PRODUCT_API_ENDPOINT}/${productId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          const product = productRes.data.product || productRes.data;
          
          if (product.stock !== undefined && product.stock < quantity) {
            set({ error: `Insufficient stock. Only ${product.stock} units available.`, loading: false });
            return;
          }
        } catch (err) {
          console.error('Error checking product stock:', err);
          // Continue with add to cart even if stock check fails
        }
        
        set({ loading: true, error: null });
        
        try {
          const res = await axios.post(
            `${CART_API_ENDPOINT}/add`,
            { productId, quantity: parseInt(quantity) },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          // Handle reverted response format
          const items = res.data.cart?.items || [];
          const processedItems = items.map(item => processCartItem(item));
          set({ items: processedItems, loading: false });
        } catch (err) {
          console.error('Error adding to cart:', err);
          set({ error: err.response?.data?.message || "Failed to add item to cart", loading: false });
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

