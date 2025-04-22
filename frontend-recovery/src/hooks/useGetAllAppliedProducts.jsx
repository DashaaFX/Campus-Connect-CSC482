import { setAllProducts } from "@/redux/productSlice";  // Import the action from productSlice
import { PRODUCT_API_ENDPOINT } from "@/utils/data";  // Make sure to have your correct API endpoint
import axios from "axios";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

const useGetAllAppliedProducts = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get(`${PRODUCT_API_ENDPOINT}/get`, {
          withCredentials: true,  // Make sure to include credentials (if required)
        });
        console.log("API Response:", res.data);
        if (res.data.success) {
          dispatch(setAllProducts(res.data.products));  // Assuming response has products
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };

    fetchProducts();
  }, [dispatch]);

  return null;
};

export default useGetAllAppliedProducts;