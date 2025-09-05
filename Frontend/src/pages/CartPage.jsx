// src/pages/CartPage.jsx
import React, { useEffect } from 'react';
import { useCartStore } from '@/store/useCartStore';
import { Button } from '@/components/ui/button';
// Removed popover import, using custom modal
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const CartPage = () => {
  const {
    items,
    loading,
    error,
    fetchCart,
    removeFromCart,
    clearCart,
    decreaseQuantity,
  } = useCartStore();

  const navigate = useNavigate();

  useEffect(() => {
    fetchCart();
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = items
    .filter(item => item?.product && item?.product.price != null)
    .reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  const handleRemove = async (id) => {
    try {
      await removeFromCart(id);
      toast.success('Item removed');
    } catch {
      toast.error('Failed to remove item');
    }
  };

  const handleClear = async () => {
    try {
      await clearCart();
      toast.success('Cart cleared');
    } catch {
      toast.error('Failed to clear cart');
    }
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };
  const [modalOpen, setModalOpen] = React.useState(false);

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
    <div className="max-w-4xl py-6 mx-auto">
      <h1 className="mb-4 text-2xl font-bold">Your Cart</h1>
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
                className="flex items-center justify-between py-4 border-b"
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
                    className="text-white bg-black"
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
            <div className="flex gap-2 mt-4">
              <Button onClick={() => setModalOpen(true)}>
                Proceed to Checkout
              </Button>
              <Button variant="outline" onClick={handleClear}>
                Clear Cart
              </Button>
            </div>
            {modalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                <div className="flex flex-col items-center gap-4 p-8 bg-white shadow-xl rounded-xl w-80">
                  <h2 className="text-lg font-semibold">Confirm Checkout</h2>
                  <p className="text-center text-gray-600">Are you sure you want to proceed to checkout?</p>
                  <div className="flex w-full gap-2 mt-2">
                    <Button 
                      onClick={() => { setModalOpen(false); handleCheckout(); }} 
                      className="w-full px-4 py-2 font-semibold text-white bg-black rounded hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black">
                        Yes, Proceed
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setModalOpen(false)} 
                      className="w-full px-4 py-2"
                    >Cancel</Button>
                  </div>
                </div>
              </div>
            )}
        </>
      )}
    </div>
  );
}

export default CartPage;
