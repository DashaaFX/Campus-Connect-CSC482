import React, { useEffect, useState } from 'react';
import api from '@/utils/axios';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuthStore } from '@/store/useAuthStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getProductTitle, getPlaceholderImage } from '@/utils/productHelpers';
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
//Admin product approval component
//Now features page pagination feature
// View detailed product info in dialog with image/pdf preview
const AdminProductApproval = () => {
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewedProduct, setViewedProduct] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [currentImgIdx, setCurrentImgIdx] = useState(0); // carousel index
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset page when filters or product list change
  useEffect(() => {
    setPage(1);
  }, [typeFilter, statusFilter, products.length]);
  const { token } = useAuthStore();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Get all products (pending, approved, rejected)
        const res = await api.get('/admin/products/pending', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProducts(res.data.products || []);
      } catch (err) {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchProducts();
  }, [token]);

  const handleApprove = async (id) => {
    await api.post(`/admin/products/${id}/approve`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setProducts(products.map(p => p.id === id ? { ...p, status: 'approved' } : p));
  };

  const handleReject = async (id) => {
    await api.post(`/admin/products/${id}/reject`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setProducts(products.map(p => p.id === id ? { ...p, status: 'rejected' } : p));
  };

  const handleView = async (id) => {
    setViewLoading(true);
    try {
      const res = await api.get(`/admin/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const product = res.data.product;

      setViewedProduct(product);
      setCurrentImgIdx(0);
      setViewOpen(true);
    } catch (err) {
      setViewedProduct(null);
    } finally {
      setViewLoading(false);
    }
  };
    // Download digital product for admin
  const handleDownload = async (id) => {
    try {
      const res = await api.get(`/admin/products/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const url = res.data.url;
      window.open(url, '_blank');
    } catch (err) {
      alert('Failed to get download link');
    }
  };


  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold">Product Approval</h1>
      {/* Minimal filter controls */}
      <div className="flex gap-4 mb-4">
        <label>
          Type:
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-2 py-1 ml-2 border rounded">
            <option value="all">All</option>
            <option value="physical">Physical</option>
            <option value="digital">Digital</option>
          </select>
        </label>
        <label>
          Status:
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-2 py-1 ml-2 border rounded">
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
      </div>
      {loading ? <div>Loading...</div> : (
        <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>Seller</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products
              .filter(product => typeFilter === 'all' || product.type === typeFilter)
              .filter(product => statusFilter === 'all' || product.status === statusFilter)
              .slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)
              .map(product => (
              <TableRow key={product.id}>
                <TableCell>{product.name}</TableCell>
                <TableCell>{((product.type && product.type.toLowerCase() === 'digital') || product.isDigital) ? 'Digital' : 'Physical'}</TableCell>
                <TableCell>
                  {product.type === 'physical' && product.mainImage ? (
                    <img src={product.mainImage} alt="Product" className="object-cover w-16 h-16 rounded cursor-pointer"/>
                  ) : product.type === 'digital' ? 
                  <img
                          src="/placeholder2.png"
                          alt="placeholder"
                          className="object-cover w-16 h-16 rounded cursor-pointer"
                        />
                  : null}
                </TableCell>
                <TableCell>{product.sellerEmail}</TableCell>
                <TableCell>
                  <Badge variant={product.status === 'approved' ? 'success' : product.status === 'rejected' ? 'destructive' : 'secondary'}>
                    {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button size="sm" onClick={() => handleView(product.id)} className="mr-2">{viewLoading && viewedProduct?.id === product.id ? 'Loading...' : 'View'}</Button>
                  <Button size="sm" onClick={() => handleApprove(product.id)} disabled={product.status === 'approved'}>Approve</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleReject(product.id)} className="ml-2">Reject</Button>
                  {product.type === 'digital' && (
                    <Button size="sm" className="ml-2" onClick={() => handleDownload(product.id)}>Download</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {/* Pagination controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
          <div className="text-sm text-gray-600">
            {(() => {
              const filteredCount = products.filter(product => (typeFilter === 'all' || product.type === typeFilter) && (statusFilter === 'all' || product.status === statusFilter)).length;
              if (filteredCount === 0) return 'No products found.';
              const start = (page - 1) * pageSize + 1;
              const end = Math.min(start + pageSize - 1, filteredCount);
              return `Showing ${start}-${end} of ${filteredCount}`;
            })()}
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-sm">Page size:
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="px-2 py-1 text-sm border rounded"
              >
                {[5,10,20,50].map(sz => <option key={sz} value={sz}>{sz}</option>)}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >Prev</Button>
            <span className="text-sm">Page {page}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const filteredCount = products.filter(product => (typeFilter === 'all' || product.type === typeFilter) && (statusFilter === 'all' || product.status === statusFilter)).length;
                const maxPage = Math.ceil(filteredCount / pageSize) || 1;
                setPage(p => Math.min(maxPage, p + 1));
              }}
              disabled={(() => {
                const filteredCount = products.filter(product => (typeFilter === 'all' || product.type === typeFilter) && (statusFilter === 'all' || product.status === statusFilter)).length;
                const maxPage = Math.ceil(filteredCount / pageSize) || 1;
                return page >= maxPage;
              })()}
            >Next</Button>
          </div>
        </div>
        </>
      )}
      <Dialog open={viewOpen} onOpenChange={(o) => { if (!o) { setViewOpen(false); setViewedProduct(null); } }}>
        {viewedProduct && (
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {viewedProduct.name || viewedProduct.title || 'Product'}
                <Badge variant={viewedProduct.status === 'approved' ? 'success' : viewedProduct.status === 'rejected' ? 'destructive' : 'secondary'}>
                  {viewedProduct.status?.[0]?.toUpperCase() + viewedProduct.status?.slice(1) || 'Pending'}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                {viewedProduct.description || 'No description available.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                {/* Image / carousel */}
                {/* Image rendering mimics Products.jsx */}
                {((viewedProduct.type && viewedProduct.type.toLowerCase() === 'digital') || viewedProduct.isDigital) ? (
                  <div className="relative w-full">
                    {/* Admin unrestricted PDF access */}
                    {Array.isArray(viewedProduct.pdf) && viewedProduct.pdf.length > 0 ? (
                      <div className="flex flex-col w-full h-64 mb-2">
                        <iframe
                          src={`https://docs.google.com/viewer?url=${encodeURIComponent(
                            viewedProduct.pdf[0].startsWith('http')
                              ? viewedProduct.pdf[0]
                              : `${BASE_URL}${viewedProduct.pdf[0]}`
                          )}&embedded=true`}
                          title={`${getProductTitle(viewedProduct)} PDF`}
                          className="w-full h-full border rounded"
                        />
                        <div className="flex items-center justify-between mt-2 text-xs">
                          <span className="px-2 py-1 font-semibold text-white bg-indigo-600 rounded">
                            Digital
                          </span>
                          {viewedProduct.digitalFormat && (
                            <span className="px-2 py-1 font-semibold text-white rounded bg-slate-600/80">
                              {String(viewedProduct.digitalFormat).toUpperCase()}
                            </span>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const raw = viewedProduct.pdf[0];
                              const url = raw.startsWith('http') ? raw : `${BASE_URL}${raw}`;
                              window.open(url, '_blank');
                            }}
                          >Open in new tab</Button>
                        </div>
                        {viewedProduct.pdf.length > 1 && (
                          <div className="mt-3 space-y-1 overflow-auto text-xs max-h-24">
                            {viewedProduct.pdf.slice(1).map((file, idx) => {
                              const full = file.startsWith('http') ? file : `${BASE_URL}${file}`;
                              return (
                                <div key={idx} className="flex items-center justify-between">
                                  <span>Additional PDF {idx + 2}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="px-2"
                                    onClick={() => window.open(full, '_blank')}
                                  >View</Button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="relative w-full">
                        <img
                          src={viewedProduct.previewImage || getPlaceholderImage()}
                          alt={`${getProductTitle(viewedProduct)} preview`}
                          className="object-contain w-full h-64 p-4 mb-2 rounded bg-gray-50"
                          onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = getPlaceholderImage(); }}
                        />
                        <span className="absolute px-2 py-1 text-xs font-semibold text-white bg-indigo-600 rounded top-2 left-2">
                          Digital
                        </span>
                        {viewedProduct.digitalFormat && (
                          <span className="absolute px-2 py-1 text-xs font-semibold text-white rounded top-2 right-2 bg-slate-600/80">
                            {String(viewedProduct.digitalFormat).toUpperCase()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {viewedProduct.images?.length === 1 ? (
                      <img
                        src={viewedProduct.images[0]}
                        alt={getProductTitle(viewedProduct)}
                        className="object-cover w-full h-64 mb-2 rounded"
                        onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = getPlaceholderImage(); }}
                      />
                    ) : viewedProduct.images?.length > 1 ? (
                      <div className="relative flex flex-col items-center w-full">
                        <img
                          src={viewedProduct.images[currentImgIdx]}
                          alt={`${getProductTitle(viewedProduct)} ${currentImgIdx + 1}`}
                          className="object-cover w-full h-64 mb-2 rounded"
                          onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = getPlaceholderImage(); }}
                        />
                        <button
                          type="button"
                          className="absolute p-2 text-white transform -translate-y-1/2 bg-gray-700 rounded-full left-2 top-1/2"
                          onClick={() => setCurrentImgIdx(prev => prev === 0 ? viewedProduct.images.length - 1 : prev - 1)}
                          aria-label="Previous image"
                        >&#8592;</button>
                        <button
                          type="button"
                          className="absolute p-2 text-white transform -translate-y-1/2 bg-gray-700 rounded-full right-2 top-1/2"
                          onClick={() => setCurrentImgIdx(prev => prev === viewedProduct.images.length - 1 ? 0 : prev + 1)}
                          aria-label="Next image"
                        >&#8594;</button>
                        <div className="flex justify-center gap-2 mt-2">
                          {viewedProduct.images.map((_, idx) => (
                            <span key={idx} className={`inline-block w-3 h-3 rounded-full ${idx === currentImgIdx ? 'bg-indigo-600' : 'bg-gray-300'}`} />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <img
                        src={getPlaceholderImage()}
                        alt="placeholder"
                        className="object-cover w-full h-64 rounded"
                      />
                    )}
                  </>
                )}
              </div>
              <div className="space-y-3 text-sm">
                <div><strong>Title:</strong> {viewedProduct.name || viewedProduct.title}</div>
                <div><strong>Type:</strong> {((viewedProduct.type && viewedProduct.type.toLowerCase() === 'digital') || viewedProduct.isDigital) ? 'Digital' : 'Physical'}</div>
                <div><strong>Price:</strong> ${Number(viewedProduct.price || 0).toFixed(2)}</div>
                <div><strong>Category:</strong> {viewedProduct.category?.name || viewedProduct.category || '—'}</div>
                <div><strong>Subcategory:</strong> {viewedProduct.subcategory || '—'}</div>
                {viewedProduct.type === 'physical' && (
                  <div><strong>Stock:</strong> {typeof viewedProduct.stock === 'number' ? viewedProduct.stock : '—'}</div>
                )}
                <div><strong>Seller Email:</strong> {viewedProduct.sellerEmail || '—'}</div>
                {(((viewedProduct.type && viewedProduct.type.toLowerCase() === 'digital') || viewedProduct.isDigital)) && (
                  <div className="mt-2">
                    <Button size="sm" onClick={() => handleDownload(viewedProduct.id)}>Download Digital File</Button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <Button variant="outline" size="sm" onClick={() => { setViewOpen(false); setViewedProduct(null); }}>Close</Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default AdminProductApproval;
