// src/pages/CartPage.jsx
import React, { useEffect, useState } from 'react';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { ORDER_API_ENDPOINT } from '@/utils/data';
import { Button } from '@/components/ui/button';
// Removed popover import, using custom modal
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  getProductImageUrl, 
  getPlaceholderImage, 
  getProductTitle,
  getProductPrice,
  processCartItem 
} from '@/utils/productHelpers';

const CartPage = () => {
  const {
    items,
    loading,
    error,
    removeFromCart,
    clearCart,
    decreaseQuantity,
  } = useCartStore();
  const { token } = useAuthStore();

  const navigate = useNavigate();

  useEffect(() => {
    // Force a new cart fetch when the component mounts
    const fetchCartData = async () => {
      try {
        // Set loading state explicitly before fetch
        useCartStore.setState({ loading: true });
        await useCartStore.getState().fetchCart();
      } catch (error) {
        console.error('Error fetching cart from useEffect:', error);
      }
    };
    
    // Immediately fetch cart data when component mounts
    fetchCartData();
    
    // Re-fetch cart once after a short delay to ensure products load
    const initialRetryTimeout = setTimeout(() => {
      fetchCartData();
    }, 800);
    
    // Re-fetch cart again after a longer delay if needed
    const secondRetryTimeout = setTimeout(() => {
      const currentItems = useCartStore.getState().items;
      const hasMissingProductInfo = currentItems.some(item => 
        !item.product || 
        item.product.title === 'Loading product...' || 
        item.product.title === 'Product not found' ||
        item.product.title === 'Error loading product' ||
        item.product.title === 'Unnamed Product'
      );
      
      if (hasMissingProductInfo) {
        fetchCartData();
      }
    }, 2500);
    
    return () => {
      clearTimeout(initialRetryTimeout);
      clearTimeout(secondRetryTimeout);
    };
  }, []);

  // Calculate total, handling potentially missing product data
  const total = items.reduce((acc, item) => {
    // Add debug info
    // Handle potentially missing product object
    if (!item || !item.product) {
      return acc;
    }
    
    const price = parseFloat(item.product?.price || 0);
    const quantity = parseInt(item.quantity || 1);
    return acc + (price * quantity);
  }, 0);

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
      await axios.post(`${ORDER_API_ENDPOINT}/request`, { productId }, { 
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Request sent');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send request';
      toast.error(msg);
    }
  };

  return (
    <div className="max-w-4xl py-6 mx-auto">
      <h1 className="mb-4 text-2xl font-bold">Your Cart</h1>
      
      {/* Show spinner when loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-10 h-10 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
          <p className="ml-3 text-gray-600">Loading cart items...</p>
        </div>
      )}
      
      {/* Show error if there is one */}
      {error && (
        <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-md">
          <p>{error}</p>
        </div>
      )}
      
      {/* Empty cart message */}
      {!loading && items.length === 0 && (
        <div className="p-8 text-center rounded-lg bg-gray-50">
          <p className="mb-4 text-xl text-gray-600">Your cart is empty.</p>
          <Button onClick={() => navigate('/')}>Continue Shopping</Button>
        </div>
      )}
      
      {/* Cart items */}
      {!loading && items.length > 0 && (
        <>
          {items.map((item) => {
            // Determine product status for UI
            const isLoading = !item.product || item.product.title === 'Loading product...';
            const isError = item.product?.title === 'Error loading product' || item.product?.title === 'Product not found';
            
            return (
              <div
                key={item.productId || item.product?._id || item.product?.id || Math.random().toString()}
                className={`flex items-center justify-between py-4 border-b ${isLoading ? 'bg-gray-50' : ''} ${isError ? 'bg-red-50' : ''}`}
              >
                <div className="flex items-center space-x-4">
                  {/* Product image */}
                  <div className="w-16 h-16 overflow-hidden rounded">
                    {isLoading ? (
                      <div className="flex items-center justify-center w-full h-full bg-gray-200 animate-pulse">
                        <span className="text-xs text-gray-500">Loading...</span>
                      </div>
                    ) : item.product ? (
                      <img
                        src={getProductImageUrl(item.product)}
                        alt={(item.product?.title || item.product?.name || 'Product')}
                        className="object-cover w-full h-full"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = getPlaceholderImage();
                        }}
                      />
                    ) : (
                      <img
                        src={getPlaceholderImage()}
                        alt="Product"
                        className="object-cover w-full h-full"
                      />
                    )}
                  </div>
                  
                  {/* Product details */}
                  <div>
                    {isLoading ? (
                      <div className="w-32 h-5 mb-2 bg-gray-200 rounded animate-pulse"></div>
                    ) : isError ? (
                      <h3 className="font-semibold text-red-600">Error loading product</h3>
                    ) : (
                      <h3 className="font-semibold">{item.product?.title || item.product?.name || 'Product'}</h3>
                    )}
                    <p className="text-gray-600">
                      ${parseFloat(item.product?.price || 0).toFixed(2)} × {item.quantity || 1}
                    </p>
                    {(item.product?.title === 'Loading product...' || !item.product?.title) && (
                      <div className="flex items-center text-xs text-amber-600">
                        <svg className="w-3 h-3 mr-1 animate-spin" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading product information...
                      </div>
                    )}
                    {item.product?.title === 'Product not found' && (
                      <p className="text-xs text-red-500">Product information unavailable</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleRemove(item.productId || item.product?._id || item.product?.id)}
                  >
                    Remove
                  </Button>
                  <Button
                    className="text-white bg-black"
                    onClick={() => handleBuyRequest(item.productId || item.product?._id || item.product?.id)}
                  >
                    Buy this
                  </Button>
                </div>
              </div>
            );
          })}
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

