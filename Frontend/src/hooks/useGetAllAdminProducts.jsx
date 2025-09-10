import { PRODUCT_API_ENDPOINT } from "@/utils/data";
import axios from "axios";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setAllAdminProducts } from "@/redux/productSlice";
import { useAuthStore } from "@/store/useAuthStore";

const useGetAllAdminProducts = (initialParams = {}) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { allAdminProducts } = useSelector((store) => store.product);
  const { token } = useAuthStore();
  const [params, setParams] = useState({
    page: 1,
    limit: 10,
    ...initialParams,
  });

  const fetchAllAdminProducts = async (customParams = {}) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const { page, limit, sort, fields, ...filters } = { ...params, ...customParams };
      
      const res = await axios.get(`${PRODUCT_API_ENDPOINT}/admin`, {
        params: { page, limit, sort, fields, ...filters },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        dispatch(setAllAdminProducts({
          products: res.data.products,
          total: res.data.count,
          totalPages: Math.ceil(res.data.count / limit),
          currentPage: page,
        }));
      } else {
        setError(res.data.message || "Failed to fetch admin products");
      }
    } catch (error) {
      console.error("Admin Products Fetch Error:", error);
      setError(error.response?.data?.message || error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAdminProducts();
  }, [dispatch, params]);

  const handlePageChange = (newPage) => {
    setParams(prev => ({ ...prev, page: newPage }));
  };

  const handleFilterChange = (newFilters) => {
    setParams(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  return { 
    loading, 
    error, 
    products: allAdminProducts,
    params,
    refetch: fetchAllAdminProducts,
    handlePageChange,
    handleFilterChange,
    setParams,
  };
};

export default useGetAllAdminProducts;
