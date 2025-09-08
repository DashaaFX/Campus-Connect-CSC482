import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';

const AdminRoute = ({ children }) => {
  const user = useAuthStore(state => state.user);
  
  // Check if user is logged in and is an admin
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (user.role !== 'Admin') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-2xl font-bold text-red-800 mb-4">Access Denied</h2>
          <p className="text-red-600 mb-4">
            You don't have permission to access this page. Admin privileges required.
          </p>
          <button 
            onClick={() => window.history.back()} 
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }
  
  return children;
};

export default AdminRoute;
