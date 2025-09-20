import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";
import  { CART_API_ENDPOINT, PRODUCT_API_ENDPOINT } from "@/utils/data";
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

          // Handle different possible response formats
          const cartItems = res.data.cart?.items || res.data.items || [];
          
          // Always fetch latest product data for each item to ensure stock is current
          const processedItems = await Promise.all(cartItems.map(async (item) => {
            if (!item || !item.productId) {
              console.warn('Invalid cart item without productId:', item);
              return null;
            }
            
            try {
              // Always fetch fresh product data to get current stock
              const productRes = await axios.get(`${PRODUCT_API_ENDPOINT}/${item.productId}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              
              const fetchedProduct = productRes.data.product || productRes.data;
              
              // Check if product still exists and has stock
              if (!fetchedProduct) {
                console.warn(`Product ${item.productId} no longer exists`);
                return processCartItem({
                  ...item,
                  product: {
                    id: item.productId,
                    title: 'Product not found',
                    price: parseFloat(item.price || 0),
                    images: [],
                    stock: 0
                  }
                });
              }
              
              return processCartItem({
                ...item,
                product: {
                  ...fetchedProduct,
                  stock: parseInt(fetchedProduct.stock || 0) // Ensure stock is a number
                }
              });
            } catch (err) {
              console.error(`Failed to fetch product ${item.productId}:`, err);
              // Return placeholder with the data we have
              return processCartItem({
                ...item,
                product: {
                  id: item.productId,
                  title: 'Error loading product',
                  price: parseFloat(item.price || 0),
                  images: [],
                  stock: 0
                }
              });
            }
          }));
          
          const filteredItems = processedItems.filter(Boolean);
          set({ items: filteredItems, loading: false });
        } catch (err) {
          console.error('Error fetching cart:', err);
          set({ error: err.response?.data?.message || "Failed to load cart", loading: false });
        }
      },

      addToCart: async ({ productId, quantity = 1 }) => {
        const { token } = useAuthStore.getState();
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
          const processedItems = items.map(item => processCartItem(item));
          set({ items: processedItems, loading: false });
          return { success: true };
        } catch (err) {
          console.error('Error adding to cart:', err);
          const errorMsg = err.response?.data?.message || "Failed to add item to cart";
          set({ error: errorMsg, loading: false });
          return { success: false, error: errorMsg };
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

