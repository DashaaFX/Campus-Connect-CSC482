import React, { useState } from 'react';
import axios from '../../utils/axios';

const AdminTester = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const makeAdmin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage('');
      
      const response = await axios.post('/admin/make-admin', { email });
      setMessage(`✅ ${response.data.message}`);
      setEmail('');
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || 'Error making user admin'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="text-lg font-semibold mb-4 text-yellow-800">
        🔧 Admin Setup Tool (Development Only)
      </h3>
      <p className="text-sm text-yellow-700 mb-4">
        Use this to make your first user an admin. Remove this in production!
      </p>
      
      <form onSubmit={makeAdmin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            User Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter user email to make admin"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Make Admin'}
        </button>
      </form>
      
      {message && (
        <div className="mt-4 p-3 bg-white border rounded-md">
          <p className="text-sm">{message}</p>
        </div>
      )}
    </div>
  );
};

export default AdminTester;
