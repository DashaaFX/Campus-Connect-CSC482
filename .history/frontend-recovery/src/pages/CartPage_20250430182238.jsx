// src/pages/CartPage.jsx
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCart, removeFromCart, clearCart } from '@/redux/cartSlice';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/components_lite/Navbar';

const CartPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, loading, error } = useSelector(state => state.cart);

  useEffect(() => {
    dispatch(fetchCart());
  }, [dispatch]);

  const total = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  const handleRemove = async (id) => {
    try {
      await dispatch(removeFromCart(id)).unwrap();
      toast.success('Item removed from cart');
      dispatch(fetchCart()); // Refresh state
    } catch {
      toast.error('Failed to remove item');
    }
  };
  
  const handleClear = async () => {
    try {
      await dispatch(clearCart()).unwrap();
      toast.success('Cart cleared');
      dispatch(fetchCart()); // Refresh state
    } catch {
      toast.error('Failed to clear cart');
    }
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  return (
    <>
    <div className="max-w-4xl mx-auto py-6">
      <h1 className="text-2xl font-bold mb-4">Your Cart</h1>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {items.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <>
          {items.map((item) => (
            <div key={item.product._id} className="flex justify-between items-center border-b py-4">
              <div>
                <h3 className="font-semibold">{item.product.title}</h3>
                <p className="text-gray-600">${item.product.price.toFixed(2)} × {item.quantity}</p>
              </div>
              <Button variant="outline" onClick={() => handleRemove(item.product._id)}>Remove</Button>
            </div>
          ))}
          <div className="mt-6 text-lg font-semibold">Total: ${total.toFixed(2)}</div>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleCheckout}>Proceed to Checkout</Button>
            <Button variant="outline" onClick={handleClear}>Clear Cart</Button>
          </div>
        </>
      )}
    </div>
  </>
  );
};

export default CartPage;
