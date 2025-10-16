//Dashnyam for Sprint 2
//Component for detailed product view
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from "@/utils/axios";
import { PRODUCT_API_ENDPOINT } from '@/utils/data';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { useCartStore } from '@/store/useCartStore';
import { formatSubcategory } from '@/utils/formatSubcategory';
import { getProductId, getProductTitle, getPlaceholderImage } from '@/utils/productHelpers';
import { fetchDigitalDownloadUrl } from '@/utils/digitalDownload';

const Products = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCartStore();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [currentImgIdx, setCurrentImgIdx] = useState(0); // image carousel index for physical products

  useEffect(() => {
    api.get(`${PRODUCT_API_ENDPOINT}/${id}`)
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
    if (typeof product.stock === 'number' && quantity > product.stock) {
      toast.error(`Cannot add ${quantity}. Only ${product.stock} available.`);
      return;
    }

    try {
      const productId = getProductId(product);
      if (!productId) throw new Error('Invalid product ID');
      await addToCart({ productId, quantity });
      toast.success(`${getProductTitle(product)} added to cart`);
    } catch (err) {
      toast.error(err.message || 'Failed to add to cart');
    }
  };

  const handlePrev = () => {
    setCurrentImgIdx((prev) =>
      product && product.images ? (prev === 0 ? product.images.length - 1 : prev - 1) : 0
    );
  };

  const handleNext = () => {
    setCurrentImgIdx((prev) =>
      product && product.images ? (prev === product.images.length - 1 ? 0 : prev + 1) : 0
    );
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!product) return <div className="p-8 text-center">Product not found.</div>;

  const isDigital = !!product.isDigital;
  const userOwns = !!product.userOwns; // set by backend gating
  const digitalAccess = product.digitalAccess; // 'full' | 'preview'

  const showAddToCart = !isDigital; // digital products purchased individually (future: direct buy)

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="container flex items-center p-4 mx-auto">
          <Button variant="ghost" onClick={() => navigate(-1)}>← Back</Button>
        </div>
      </div>
      <div className="container px-4 py-8 mx-auto">
        <div className="flex flex-col gap-8 md:flex-row">
          <div className="flex flex-col items-center w-full md:w-1/2">
            {/* Digital product preview */}
            {isDigital ? (
              <div className="relative w-full">
                <img
                  src={product.previewImage || getPlaceholderImage()}
                  alt={`${getProductTitle(product)} preview`}
                  className="object-contain w-full mb-2 bg-gray-50 rounded h-96 p-4"
                  onError={(e) => { e.target.onerror = null; e.target.src = getPlaceholderImage(); }}
                />
                <span className="absolute top-2 left-2 bg-indigo-600 text-white text-xs font-semibold px-2 py-1 rounded">
                  Digital
                </span>
                {!userOwns && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white rounded">
                    <p className="px-4 text-sm font-medium text-center">Preview only. Purchase to unlock full document.</p>
                  </div>
                )}
              </div>
            ) : (
              // Physical product images / legacy handling
              <>
                {product.images?.length === 1 ? (
                  <img
                    src={product.images[0]}
                    alt={getProductTitle(product)}
                    className="object-cover w-full mb-2 rounded h-96"
                    onError={(e) => { e.target.onerror = null; e.target.src = getPlaceholderImage(); }}
                  />
                ) : product.images?.length > 1 ? (
                  <div className="relative flex flex-col items-center w-full">
                    <img
                      src={product.images[currentImgIdx]}
                      alt={`${getProductTitle(product)} ${currentImgIdx + 1}`}
                      className="object-cover w-full mb-2 rounded h-96"
                      onError={(e) => { e.target.onerror = null; e.target.src = getPlaceholderImage(); }}
                    />
                    <button type="button" className="absolute p-2 text-white transform -translate-y-1/2 bg-gray-700 rounded-full left-2 top-1/2" onClick={handlePrev} aria-label="Previous image">&#8592;</button>
                    <button type="button" className="absolute p-2 text-white transform -translate-y-1/2 bg-gray-700 rounded-full right-2 top-1/2" onClick={handleNext} aria-label="Next image">&#8594;</button>
                    <div className="flex justify-center gap-2 mt-2">
                      {product.images.map((_, idx) => (
                        <span key={idx} className={`inline-block w-3 h-3 rounded-full ${idx === currentImgIdx ? 'bg-yellow-500' : 'bg-gray-300'}`} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <img src={getPlaceholderImage()} alt="placeholder" className="object-cover w-full rounded h-96" />
                )}
              </>
            )}
          </div>

          <div className="flex-1">
            <h1 className="mb-4 text-3xl font-bold">{product.name}</h1>
            {isDigital && (
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-block px-2 py-0.5 text-xs bg-indigo-100 text-indigo-800 rounded font-medium">Digital</span>
                {product.digitalFormat && (
                  <span className="inline-block px-2 py-0.5 text-xs bg-slate-100 text-slate-700 rounded">{product.digitalFormat.toUpperCase()}</span>
                )}
                {userOwns ? (
                  <span className="inline-block px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">Owned</span>
                ) : (
                  <span className="inline-block px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">Preview</span>
                )}
              </div>
            )}
            <p className="mb-4 text-gray-700">{product.description}</p>
            <div className="mb-4 text-xl font-semibold">${Number(product.price || 0).toFixed(2)}</div>
            <div className="mb-2"><strong>Category:</strong> {product.category?.name || product.category}</div>
            <div className="mb-2"><strong>Subcategory:</strong> {formatSubcategory(product.subcategory)}</div>
            <div className="mb-2"><strong>Stock:</strong> {product.stock}</div>

            {/* Purchase / ownership actions */}
            {isDigital ? (
              <div className="mt-4">
                {userOwns ? (
                  <Button
                    variant="default"
                    onClick={async () => {
                      try {
                        const url = await fetchDigitalDownloadUrl(getProductId(product));
                        if (!url) {
                          toast.error('Download unavailable');
                          return;
                        }
                        window.location.href = url;
                      } catch (e) {
                        toast.error(e.response?.data?.message || 'Download failed');
                      }
                    }}
                  >
                    Download File
                  </Button>
                ) : (
                  <Button onClick={() => {
                    addToCart({ productId: getProductId(product), quantity: 1 })
                      .then(() => toast.success('Added to cart'))
                      .catch(() => toast.error('Failed to add to cart'));
                  }}>
                    Purchase to Unlock
                  </Button>
                )}
              </div>
            ) : (
              product.stock > 0 ? (
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
              )
            )}
            
            {/* Add more product details later, on later sprints */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;