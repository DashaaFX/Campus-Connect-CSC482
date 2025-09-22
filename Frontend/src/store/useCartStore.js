import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";
import  { CART_API_ENDPOINT, PRODUCT_API_ENDPOINT } from "@/utils/data";
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
          const res = await axios.get(CART_API_ENDPOINT, {
            headers: { Authorization: `Bearer ${token}` }
          });

          // Handle different possible response formats
          const cartItems = res.data.cart?.items || res.data.items || [];
          
          // Always fetch latest product data for each item to ensure stock is current
          const processedItems = await Promise.all(cartItems.map(async (item) => {
            if (!item || !item.productId) {
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
                return {
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
          set({ items, loading: false });
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

