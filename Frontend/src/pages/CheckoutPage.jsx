// src/pages/CheckoutPage.jsx
import React from 'react';
import axios from 'axios';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { ORDER_API_ENDPOINT } from '@/utils/data';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getProductImageUrl, getPlaceholderImage } from '@/utils/productHelpers';

const CheckoutPage = () => {
  const { items, loading, error, clearCart } = useCartStore(); 
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Fetch cart items when component mounts
  React.useEffect(() => {
    const fetchCartData = async () => {
      try {
        // Set loading state explicitly before fetch
        useCartStore.setState({ loading: true });
        await useCartStore.getState().fetchCart();
      } catch (error) {
        console.error('Error fetching cart:', error);
        toast.error('Failed to load cart items');
      }
    };
    
    // Immediate initial fetch
    fetchCartData();
    
    // Re-fetch cart once after a short delay to ensure products load correctly
    const initialRetryTimeout = setTimeout(() => {
      fetchCartData();
    }, 800);
    
    return () => {
      clearTimeout(initialRetryTimeout);
    };
  }, []);

  // Calculate total
  const total = items.reduce((acc, item) => {
    if (!item?.product?.price) return acc;
    return acc + (parseFloat(item.product.price) * (parseInt(item.quantity) || 1));
  }, 0);

  const placeOrder = async () => {
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    try {
      setIsProcessing(true);
      await axios.post(`${ORDER_API_ENDPOINT}/place`, {}, { 
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Order placed successfully!');
      await clearCart(); // clear cart via Zustand
      navigate('/my-orders');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Checkout failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl py-8 mx-auto">
      <h1 className="mb-6 text-3xl font-extrabold text-center text-gray-800">Checkout</h1>
      
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-10 h-10 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
          <p className="ml-3 text-gray-600">Loading cart items...</p>
        </div>
      )}
      
      {error && (
        <div className="p-4 mb-6 text-red-700 bg-red-100 rounded-lg">
          <p>{error}</p>
        </div>
      )}
      
      {!loading && items.length === 0 ? (
        <div className="p-8 text-center bg-white border border-gray-200 shadow-sm rounded-xl">
          <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="mx-auto mb-4 text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.35 2.7A2 2 0 007.5 18h9a2 2 0 001.85-2.7L17 13M7 13V6h13" />
          </svg>
          <h2 className="mb-2 text-xl font-semibold">Your cart is empty</h2>
          <p className="mb-4 text-gray-500">Add items to your cart before checkout.</p>
          <button 
            onClick={() => navigate('/')}
            className="px-4 py-2 font-medium text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
          >
            Continue Shopping
          </button>
        </div>
      ) : !loading && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
              <h2 className="mb-4 text-xl font-semibold">Order Items</h2>
              
              <div className="space-y-4">
                {items.map(item => (
                  <div key={item.productId} className="flex items-center p-3 border border-gray-100 rounded-lg">
                    <div className="w-16 h-16 overflow-hidden rounded-md">
                      {item.product ? (
                        <img
                          src={getProductImageUrl(item.product)}
                          alt={item.product.title}
                          className="object-cover w-full h-full"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = getPlaceholderImage();
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full bg-gray-200">
                          <span className="text-xs text-gray-500">No image</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 ml-4">
                      <h3 className="font-medium">{item.product?.title || 'Product'}</h3>
                      <p className="text-sm text-gray-500">
                        Quantity: {item.quantity} × ${parseFloat(item.product?.price || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="font-medium">
                      ${((parseFloat(item.product?.price || 0) * item.quantity) || 0).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="h-fit">
            <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
              <h2 className="mb-4 text-xl font-semibold">Order Summary</h2>
              
              <div className="py-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span>Free</span>
                </div>
                <div className="pt-2 mt-2 border-t border-gray-200">
                  <div className="flex justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="font-semibold">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={placeOrder}
                disabled={isProcessing || items.length === 0}
                className={`w-full px-4 py-3 mt-4 font-medium text-white bg-black rounded-lg 
                  ${isProcessing || items.length === 0 ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-800'}`}
              >
                {isProcessing ? 'Processing...' : 'Place Order'}
              </button>
              
              <button
                onClick={() => navigate('/cart')}
                className="w-full px-4 py-2 mt-2 font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Back to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;

