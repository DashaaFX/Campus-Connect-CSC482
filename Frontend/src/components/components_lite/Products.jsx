import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { PRODUCT_API_ENDPOINT } from '@/utils/data';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { useCartStore } from '@/store/useCartStore';
import { formatSubcategory } from '@/utils/formatSubcategory';
import { getProductId, getProductTitle, getProductPrice, getProductImageUrl, getPlaceholderImage } from '@/utils/productHelpers';

const Products = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCartStore();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    axios.get(`${PRODUCT_API_ENDPOINT}/${id}`)
      .then(res => {
        const productData = res.data.product || res.data;
        setProduct(productData);
      })
      .catch(err => { 
        console.error('Error fetching product:', err); 
        setError('Failed to load product'); 
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = async () => {
    if (quantity > product.stock) {
      toast.error('Requested quantity exceeds stock available');
      return;
    }

    try {
      // Use the utility function to get a consistent ID
      const productId = getProductId(product);
      if (!productId) {
        toast.error('Invalid product ID');
        return;
      }
      
      const result = await addToCart({ productId, quantity });
      if (result.success) {
        toast.success(`${getProductTitle(product)} added to cart`);
      } else {
        toast.error(result.error || 'Failed to add to cart');
      }
    } catch (err) {
      console.error('Failed to add to cart:', err);
      toast.error('Failed to add to cart');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="container flex items-center p-4 mx-auto">
          <Button variant="ghost" onClick={() => navigate(-1)}>← Back</Button>
        </div>
      </div>
      <div className="container px-4 py-8 mx-auto">
        <div className="flex flex-col gap-8 md:flex-row">
          <div className="w-full md:w-1/2">
            {product.images?.length > 0 ? (
              <img
                src={getProductImageUrl(product)}
                alt={getProductTitle(product)}
                className="object-cover w-full h-auto rounded"
                onError={(e) => {
                  console.error('Image failed to load:', e.target.src);
                  e.target.onerror = null;
                  e.target.src = getPlaceholderImage();
                }}
              />
            ) : product.pdf?.length > 0 ? (
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(product.pdf[0])}&embedded=true`}
                title="PDF Preview"
                width="100%"
                height="500px"
                className="border rounded"
              />
            ) : (
              <img
                src={getPlaceholderImage()}
                alt="placeholder"
                className="object-cover w-full h-auto rounded"
              />
            )}
          </div>

          <div className="flex-1">
            <h1 className="mb-4 text-3xl font-bold">{product.title}</h1>
            {product.pdf?.length > 0 && (
              <span className="inline-block mb-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                Digital PDF Material
              </span>
            )}
            <p className="mb-4 text-gray-700">{product.description}</p>
            <div className="mb-4 text-xl font-semibold">${Number(product.price || 0).toFixed(2)}</div>
            <div className="mb-2"><strong>Category:</strong> {product.category?.name || product.category}</div>
            <div className="mb-2"><strong>Subcategory:</strong> {formatSubcategory(product.subcategory)}</div>
            <div className="mb-2"><strong>Condition:</strong> {product.condition}</div>
            <div className="mb-2"><strong>Stock:</strong> {product.stock}</div>

            {product.stock > 0 ? (
              <>
                <div className="mt-4 mb-4">
                  <label className="block mb-1 font-semibold">Quantity</label>
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
              <div className="mt-4 font-semibold text-red-500">Out of Stock</div>
            )}
            
            {/* Product details continue here */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;

