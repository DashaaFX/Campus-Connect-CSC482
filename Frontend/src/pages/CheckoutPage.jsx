// src/pages/CheckoutPage.jsx
import React from 'react';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { CART_API_ENDPOINT, ORDER_API_ENDPOINT } from '@/utils/data';
import { useNavigate } from 'react-router-dom';
import { clearCart } from '@/redux/cartSlice';
import { toast } from 'sonner';

const CheckoutPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const placeOrder = async () => {
    try {
      await axios.post(`${ORDER_API_ENDPOINT}/place`, {}, { withCredentials: true });
      toast.success('Order placed successfully!');
      dispatch(clearCart());
      navigate('/my-orders');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Checkout failed');
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Checkout</h1>
      <p className="mb-4">Ready to place your order?</p>
      <button onClick={placeOrder} className="btn btn-primary">Place Order</button>
    </div>
  );
};

export default CheckoutPage;
