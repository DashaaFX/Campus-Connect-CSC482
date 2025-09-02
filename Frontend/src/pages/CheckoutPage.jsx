// src/pages/CheckoutPage.jsx
import React from 'react';
import axios from 'axios';
import { useCartStore } from '@/store/useCartStore';
import { ORDER_API_ENDPOINT } from '@/utils/data';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const CheckoutPage = () => {
  const { clearCart } = useCartStore(); 
  const navigate = useNavigate();

  const placeOrder = async () => {
    try {
      await axios.post(`${ORDER_API_ENDPOINT}/place`, {}, { withCredentials: true });
      toast.success('Order placed successfully!');
      await clearCart(); // clear cart via Zustand
      navigate('/my-orders');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Checkout failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md p-8 bg-white border border-gray-100 shadow-xl rounded-2xl">
        <div className="flex flex-col items-center mb-6">
          <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="mb-4 text-primary-500">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.35 2.7A2 2 0 007.5 18h9a2 2 0 001.85-2.7L17 13M7 13V6h13" />
          </svg>
          <h1 className="mb-2 text-3xl font-extrabold text-gray-800">Checkout</h1>
          <p className="text-center text-gray-500">Review your order and place it securely.</p>
        </div>
        
        <button
          onClick={placeOrder}
          className="w-full px-4 py-2 font-semibold text-white bg-black rounded hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black"
        >
          Place Order
        </button>
      </div>
    </div>
  );
};

export default CheckoutPage;
