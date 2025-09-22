import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/utils/axios";
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
          const res = await api.get(CART_API_ENDPOINT, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const processedItems = await Promise.all((res.data.items || []).map(async (item) => {
            if (!item || !item.productId) {
              console.warn('Invalid cart item without productId:', item);
              return null;
            }
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
          const hasMissingProducts = filteredItems.some(
            item => !item.product || item.product.title === 'Loading product...'
          );
          set({ items: filteredItems, loading: false });
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
        }
      },

      removeFromCart: async (productId) => {
        const { token } = useAuthStore.getState();
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

