// src/components/components_lite/Products.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { PRODUCT_API_ENDPOINT } from '@/utils/data';
import { Button } from '../ui/button';
import { useDispatch } from 'react-redux';
import { addToCart , fetchCart } from '@/redux/cartSlice';
import { toast } from 'sonner';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';


const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const Products = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    axios.get(`${PRODUCT_API_ENDPOINT}/${id}`)
      .then(res => setProduct(res.data.data || res.data))
      .catch(err => { console.error(err); setError('Failed to load product'); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = () => {
    if (quantity > product.stock) {
      toast.error('Requested quantity exceeds stock available');
      return;
    }

    dispatch(addToCart({ productId: product._id, quantity }))
      .unwrap()
      .then(() => toast.success('Added to cart'))
      .catch(err => toast.error(err));
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <> 
    <div className="min-h-screen flex flex-col">
      <div className="bg-white sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto p-4 flex items-center">
          <Button variant="ghost" onClick={() => navigate(-1)}>← Back</Button>
        </div>
      </div>
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col md:flex-row gap-8">
          <img
            src={
              product.images?.[0]
                ? `${BASE_URL}${product.images[0]}`
                : '/placeholder-image.jpg'
            }
            alt={product.title}
            className="w-full md:w-1/2 h-auto object-cover rounded"
          />
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-4">{product.title}</h1>
            <p className="text-gray-700 mb-4">{product.description}</p>
            <div className="text-xl font-semibold mb-4">${product.price.toFixed(2)}</div>
            <div className="mb-2"><strong>Category:</strong> {product.category?.name || product.category}</div>
            <div className="mb-2"><strong>Subcategory:</strong> {product.subcategory?.name || product.subcategory}</div>
            <div className="mb-2"><strong>Condition:</strong> {product.condition}</div>
            <div className="mb-2"><strong>Stock:</strong> {product.stock}</div>

            {product.stock > 0 ? (
              <>
                <div className="mb-4 mt-4">
                  <label className="block font-semibold mb-1">Quantity</label>
                  <Select value={quantity.toString()} onValueChange={(val) => setQuantity(parseInt(val))}>
                    <SelectTrigger className="w-24">
                      <SelectValue placeholder="Qty" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(product.stock).keys()].map(n => (
                        <SelectItem key={n + 1} value={(n + 1).toString()}>
                          {n + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="mt-2" onClick={handleAddToCart}>Add to Cart</Button>
              </>
            ) : (
              <div className="text-red-500 font-semibold mt-4">Out of Stock</div>
            )}
          </div>
        </div>
      </div>
    </div>
  </>
  );
};

export default Products;
