// src/store/useProductStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";
import { PRODUCT_API_ENDPOINT } from "@/utils/data";

export const useProductStore = create(
  persist(
    (set, get) => ({
      products: [],
      product: null,
      loading: false,
      error: null,
      total: 0,
      totalPages: 1,
      currentPage: 1,
      selectedCategory: null,
      selectedSubcategory: null,

      // Helpers
      setLoading: (loading) => set({ loading }),
      resetError: () => set({ error: null }),
      clearProduct: () => set({ product: null, error: null }),
      setCategory: (categoryId) => set({ selectedCategory: categoryId, selectedSubcategory: null }),
      setSubcategory: (subcategoryId) => set({ selectedSubcategory: subcategoryId }),
      clearFilters: () => set({ selectedCategory: null, selectedSubcategory: null }),
      // Derived state: reactive filtered products
      get filteredProducts() {
        return get().products.filter((product) => {
          if (get().selectedCategory && product.category !== get().selectedCategory) return false;
          if (get().selectedSubcategory && product.subcategory !== get().selectedSubcategory) return false;
          return true;
        });
      },



      // Fetch all products
      fetchProducts: async (page = 1) => {
        set({ loading: true, error: null });
        try {
          const res = await axios.get(`${PRODUCT_API_ENDPOINT}?page=${page}`);
          const data = res.data;
          set({
            products: data.products || [],
            total: data.count || 0,
            totalPages: Math.ceil((data.count || 0) / 10),
            currentPage: page,
            loading: false,
          });
        } catch (err) {
          set({
            error: err.response?.data?.message || "Failed to fetch products",
            loading: false,
          });
        }
      },

      // Fetch single product
      fetchProductById: async (id) => {
        set({ loading: true, error: null });
        try {
          const res = await axios.get(`${PRODUCT_API_ENDPOINT}/${id}`);
          set({ product: res.data.product || res.data, loading: false });
        } catch (err) {
          set({
            error: err.response?.data?.message || "Failed to fetch product",
            loading: false,
          });
        }
      },

      // Create new product
      createNewProduct: async ({ formData, token }) => {
        set({ loading: true, error: null });
        try {
          const res = await axios.post(PRODUCT_API_ENDPOINT, formData, {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${token}`,
            },
          });
          const newProduct = res.data.product || res.data;
          set((state) => ({
            products: [newProduct, ...state.products],
            product: newProduct,
            loading: false,
          }));
        } catch (err) {
          set({
            error: err.response?.data?.message || "Failed to create product",
            loading: false,
          });
        }
      },

      // Update existing product
      updateExistingProduct: async ({ id, productData, token }) => {
        set({ loading: true, error: null });
        try {
          const res = await axios.put(`${PRODUCT_API_ENDPOINT}/${id}`, productData, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const updatedProduct = res.data.product || res.data;
          set((state) => ({
            product: updatedProduct,
            products: state.products.map((p) =>
              p._id === updatedProduct._id ? updatedProduct : p
            ),
            loading: false,
          }));
        } catch (err) {
          set({
            error: err.response?.data?.message || "Failed to update product",
            loading: false,
          });
        }
      },

      // Delete product
      deleteProduct: async ({ id, token }) => {
        set({ loading: true, error: null });
        try {
          await axios.delete(`${PRODUCT_API_ENDPOINT}/${id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          set((state) => ({
            products: state.products.filter((p) => p._id !== id),
            product: state.product?._id === id ? null : state.product,
            loading: false,
          }));
        } catch (err) {
          set({
            error: err.response?.data?.message || "Failed to delete product",
            loading: false,
          });
        }
      },

      // Update product stock
      updateProductStock: async ({ id, quantity }) => {
        set({ loading: true, error: null });
        try {
          const res = await axios.patch(`${PRODUCT_API_ENDPOINT}/${id}/stock`, { quantity });
          const updatedProduct = res.data;
          set((state) => ({
            product: updatedProduct,
            products: state.products.map((p) =>
              p._id === updatedProduct._id ? updatedProduct : p
            ),
            loading: false,
          }));
        } catch (err) {
          set({
            error: err.response?.data?.message || "Failed to update stock",
            loading: false,
          });
        }
      },
    }),
    {
      name: "product-storage",
      partialize: (state) => ({ products: state.products }),
    }
  )
);
