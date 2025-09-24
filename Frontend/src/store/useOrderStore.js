import { create } from "zustand";
import api from "@/utils/axios";
import { ORDER_API_ENDPOINT } from "@/utils/data";
import { useAuthStore } from "@/store/useAuthStore";

// Order store to manage user orders and sales
export const useOrderStore = create((set) => ({
  orders: [],
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchOrders: async () => {
    set({ loading: true, error: null });
    const token = useAuthStore.getState().token;
    try {
      const res = await api.get(`${ORDER_API_ENDPOINT}/my-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ orders: res.data.orders || [], loading: false });
      return res.data.orders || [];
    } catch (err) {
      set({ loading: false, error: err.response?.data?.message || err.message });
      return [];
    }
  },

  fetchSales: async () => {
    set({ loading: true, error: null });
    const token = useAuthStore.getState().token;
    try {
      const res = await api.get(`${ORDER_API_ENDPOINT}/seller-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ orders: res.data.orders || [], loading: false });
      return res.data.orders || [];
    } catch (err) {
      set({ loading: false, error: err.response?.data?.message || err.message });
      return [];
    }
  },

  placeOrder: async (orderData) => {
    set({ loading: true, error: null });
    const token = useAuthStore.getState().token;
    try {
      const res = await api.post(`${ORDER_API_ENDPOINT}/create`, orderData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ loading: false });
      return res.data;
    } catch (err) {
      set({ loading: false, error: err.response?.data?.message || err.message });
      throw err;
    }
  },

  updateOrderStatus: async (orderId, status) => {
    set({ loading: true, error: null });
    const token = useAuthStore.getState().token;
    try {
      const res = await api.put(
        `${ORDER_API_ENDPOINT}/${orderId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      set((state) => ({
        orders: state.orders.map((o) =>
          o._id === orderId || o.id === orderId ? { ...o, status } : o
        ),
        loading: false,
      }));
      return res.data;
    } catch (err) {
      set({ loading: false, error: err.response?.data?.message || err.message });
      throw err;
    }
  },
}));

export default useOrderStore;