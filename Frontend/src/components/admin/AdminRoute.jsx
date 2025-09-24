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
      <div className="max-w-4xl p-6 mx-auto">
        <div className="p-6 text-center border border-red-200 rounded-lg bg-red-50">
          <h2 className="mb-4 text-2xl font-bold text-red-800">Access Denied</h2>
          <p className="mb-4 text-red-600">
            You don't have permission to access this page. Admin privileges required.
          </p>
          <button 
            onClick={() => window.history.back()} 
            className="px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700"
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

