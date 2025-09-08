import { setAllProducts } from "@/redux/productSlice";  // Import the action from productSlice
import { PRODUCT_API_ENDPOINT } from "@/utils/data";  // Ensure your API endpoint is correctly defined
import axios from "axios";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

const useGetAllProducts = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { searchedQuery } = useSelector((store) => store.product);  // Get the search query from Redux store

  useEffect(() => {
    const fetchAllProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(
          `${PRODUCT_API_ENDPOINT}?search=${searchedQuery}`
        );
        console.log("API Response:", res.data);
        if (res.data.success) {
          // Assuming a successful response contains products under `data.products`
          dispatch(setAllProducts(res.data.products));
        } else {
          setError("Failed to fetch products.");
        }
      } catch (error) {
        console.error("Fetch Error:", error);
        setError(error.message || "An error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllProducts();
  }, [dispatch, searchedQuery]);  // Trigger re-fetch when searchedQuery changes

  return { loading, error };
};

export default useGetAllProducts;