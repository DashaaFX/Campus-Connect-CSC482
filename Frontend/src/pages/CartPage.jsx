import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchCart,
  clearCart,
  decreaseQuantityFromCart
} from '@/redux/cartSlice';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const CartPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, loading, error } = useSelector((state) => state.cart);

  useEffect(() => {
    dispatch(fetchCart());
  }, [dispatch]);

  const total = items
    .filter(item => item?.product && item?.product.price != null)
    .reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  const handleRemove = async (id) => {
    try {
      await dispatch(decreaseQuantityFromCart(id)).unwrap();
      dispatch(fetchCart());
    } catch {
      toast.error('Failed to remove item');
    }
  };

  const handleClear = async () => {
    try {
      await dispatch(clearCart()).unwrap();
      dispatch(fetchCart());
      toast.success('Cart cleared');
    } catch {
      toast.error('Failed to clear cart');
    }
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  const handleBuyRequest = async (productId) => {
    if (!window.confirm('Buy this product?')) return;
    try {
      await axios.post(`${BASE_URL}/api/orders/request`, { productId }, { withCredentials: true });
      toast.success('Request sent');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send request';
      toast.error(msg);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6">
      <h1 className="text-2xl font-bold mb-4">Your Cart</h1>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {items.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <>
          {items.filter(item => item?.product)
            .map((item) => (
              <div
                key={item.product._id}
                className="flex justify-between items-center border-b py-4"
              >
                <div>
                  <h3 className="font-semibold">{item.product.title}</h3>
                  <p className="text-gray-600">
                    ${item.product.price.toFixed(2)} × {item.quantity}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleRemove(item.product._id)}
                  >
                    Remove
                  </Button>
                  <Button
                    className="bg-black text-white"
                    onClick={() => handleBuyRequest(item.product._id)}
                  >
                    Buy this
                  </Button>
                </div>
              </div>
          ))}
          <div className="mt-6 text-lg font-semibold">
            Total: ${total.toFixed(2)}
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleCheckout}>Proceed to Checkout</Button>
            <Button variant="outline" onClick={handleClear}>
              Clear Cart
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default CartPage;
