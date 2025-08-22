"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useStore";

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    const handleRedirect = async () => {
      // If already authenticated, redirect based on role
      if (isAuthenticated && user) {
        const destination = user.role === "ADMIN" ? "/admin" : "/dashboard";
        router.replace(destination);
        return;
      }

      // Check authentication with backend
      const authenticated = await checkAuth();

      if (authenticated) {
        // Get updated user data from store after checkAuth
        const updatedUser = useAuthStore.getState().user;
        const destination =
          updatedUser?.role === "ADMIN" ? "/admin" : "/dashboard";
        router.replace(destination);
      } else {
        router.replace("/login");
      }
    };

    handleRedirect();
  }, [isAuthenticated, user, checkAuth, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      <div className="ml-4 text-white">Redirecting...</div>
    </div>
  );
}
