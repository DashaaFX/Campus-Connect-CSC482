import React, { useEffect, useState } from 'react';
import api from '@/utils/axios';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuthStore } from '@/store/useAuthStore';

const AdminProductApproval = () => {
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewedProduct, setViewedProduct] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
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
      setViewedProduct(res.data.product);
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
      <h1 className="text-2xl font-bold mb-4">Product Approval</h1>
      {/* Minimal filter controls */}
      <div className="mb-4 flex gap-4">
        <label>
          Type:
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="ml-2 border rounded px-2 py-1">
            <option value="all">All</option>
            <option value="physical">Physical</option>
            <option value="digital">Digital</option>
          </select>
        </label>
        <label>
          Status:
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="ml-2 border rounded px-2 py-1">
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
              .map(product => (
              <TableRow key={product.id}>
                <TableCell>{product.title}</TableCell>
                <TableCell>{product.type === 'digital' ? 'Digital' : 'Physical'}</TableCell>
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
                  <Button size="sm" onClick={() => handleView(product.id)} className="mr-2">View</Button>
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
      )}
      {viewLoading && <div>Loading product details...</div>}
      {viewedProduct && (
        <div className="mt-6 p-4 border rounded bg-gray-50">
          <h2 className="text-xl font-semibold mb-2">Product Details</h2>
          <div><strong>Title:</strong> {viewedProduct.title}</div>
          <div><strong>Description:</strong> {viewedProduct.description}</div>
          <div><strong>Category:</strong> {viewedProduct.category}</div>
          <div><strong>Status:</strong> {viewedProduct.status}</div>
          <div><strong>Seller:</strong> {viewedProduct.sellerEmail}</div>
          <div><strong>Type:</strong> {viewedProduct.type === 'digital' ? 'Digital' : 'Physical'}</div>
          {viewedProduct.type === 'physical' && viewedProduct.image && (
            <div className="my-2"><img src={viewedProduct.image} alt="Product" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8 }} /></div>
          )}
          {viewedProduct.type === 'digital' && (
            <Button size="sm" className="mt-2" onClick={() => handleDownload(viewedProduct.id)}>Download Digital File</Button>
          )}
          <Button size="sm" className="mt-2" onClick={() => setViewedProduct(null)}>Close</Button>
        </div>
      )}
    </div>
  );
};

export default AdminProductApproval;
