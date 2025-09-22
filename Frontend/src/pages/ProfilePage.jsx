import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import ProfilePictureManager from '@/components/profile/ProfilePictureManager';
import EditProfileModal from '@/components/components_lite/EditProfileModal';

const ProfilePage = () => {
  const { user, token, loading } = useAuthStore();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!token && !loading) {
      navigate('/login');
    }
  }, [token, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
        <p className="ml-3 text-gray-600">Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect due to useEffect
  }

  return (
    <div className="max-w-3xl px-4 py-8 mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <button
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
          onClick={() => setEditOpen(true)}
        >
          Edit Profile
        </button>
      </div>
      <EditProfileModal open={editOpen} setOpen={setEditOpen} />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Left column: Profile picture */}
        <div className="md:col-span-1">
          <ProfilePictureManager />
        </div>
        
        {/* Right column: Profile information */}
        <div className="md:col-span-2">
          <div className="p-6 bg-white rounded-lg shadow-sm">
            <h3 className="mb-4 text-lg font-medium">Personal Information</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600">Name</label>
                <p className="mt-1 font-medium">{user.fullname}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600">Email</label>
                <p className="mt-1">{user.email}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600">Phone Number</label>
                <p className="mt-1">{user.phoneNumber || 'Not provided'}</p>
              </div>
              
              {user.idnum && (
                <div>
                  <label className="block text-sm font-medium text-gray-600">ID Number</label>
                  <p className="mt-1">{user.idnum}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-600">Account Type</label>
                <p className="mt-1">{user.role || 'User'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

