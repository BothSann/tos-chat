'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useStore';
import RegisterForm from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore();

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuthStatus = async () => {
      // If already authenticated, redirect based on role
      if (isAuthenticated && user) {
        const destination = (user.isAdmin || user.role === 'ADMIN') ? '/admin' : '/dashboard';
        router.replace(destination);
        return;
      }

      // Check with backend if we have cookies but no state
      if (!isAuthenticated && !user) {
        const authenticated = await checkAuth();
        if (authenticated) {
          // Get updated user data from store after checkAuth
          const updatedUser = useAuthStore.getState().user;
          const destination = (updatedUser?.isAdmin || updatedUser?.role === 'ADMIN') ? '/admin' : '/dashboard';
          router.replace(destination);
        }
      }
    };

    checkAuthStatus();
  }, [isAuthenticated, user, checkAuth, router]);

  // If authenticated, don't render the register form
  if (isAuthenticated && user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
        <div className="ml-4 text-white">Redirecting...</div>
      </div>
    );
  }

  return <RegisterForm />;
}
