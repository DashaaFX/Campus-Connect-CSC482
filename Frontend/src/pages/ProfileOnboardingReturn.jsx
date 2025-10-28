import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';

const ProfileOnboardingReturn = () => {
  const { user, token, loading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token && !loading) {
      navigate('/login');
      return;
    }
    // Show a toast and redirect to profile after onboarding
    toast.success('Stripe onboarding complete or updated.');
    setTimeout(() => {
      navigate('/profile');
    }, 2000);
  }, [token, loading, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-green-500 rounded-full border-t-transparent animate-spin"></div>
      <p className="mt-4 text-lg text-gray-700">Processing Stripe onboarding return...</p>
      <p className="mt-2 text-sm text-gray-500">You will be redirected to your profile shortly.</p>
    </div>
  );
};

export default ProfileOnboardingReturn;
