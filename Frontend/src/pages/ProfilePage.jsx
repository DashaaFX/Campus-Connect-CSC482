import React, { useEffect, useState } from 'react';
import { getSellerOnboardingLink } from '@/utils/axios';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import ProfilePictureManager from '@/components/profile/ProfilePictureManager';
import EditProfileModal from '@/components/profile/EditProfileModal';
import { useProductStore } from '@/store/useProductStore';
import api from '@/utils/axios';
import { SELLERS_API_ENDPOINT } from '@/utils/data';

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

  // helper: check if user has products
  const hasProducts = useProductStore.getState().products.some(p => p.sellerId === user.id);

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

            <div className="space-y-4 mt-4">
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

              {/* Seller onboarding button: show for any user with products or stripeAccountId */}
              {((user.stripeAccountId || user.stripeOnboardingStatus !== 'complete') || hasProducts) && (
                <div>
                  <label className="block text-sm font-medium text-gray-600">Stripe Payouts</label>

                  {user.stripeOnboardingStatus !== 'complete' ? (
                    <>
                      <div className="mt-2">
                        <button
                          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
                          onClick={async () => {
                            try {
                              const res = await getSellerOnboardingLink();
                              window.open(res.data.onboardingUrl, '_blank');
                            } catch (e) {
                              alert('Failed to get onboarding link: ' + (e?.response?.data?.message || e.message));
                            }
                          }}
                        >
                          {user.stripeOnboardingStatus === 'incomplete' ? 'Continue Stripe Onboarding' : 'Start Stripe Onboarding'}
                        </button>

                        <button
                          className="ml-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded hover:bg-blue-200"
                          onClick={async () => {
                            try {
                              await api.post(`${SELLERS_API_ENDPOINT}/check-onboarding-status`);
                              // Optionally, update user state here if you have a setter
                              window.location.reload(); // Reload to reflect updated status
                            } catch (e) {
                              alert('Failed to check onboarding status: ' + (e?.response?.data?.message || e.message));
                            }
                          }}
                        >
                          Refresh Stripe Status
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="mt-2">
                      <span className="px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Stripe Onboarding Complete
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
