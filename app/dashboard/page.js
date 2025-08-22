"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useStore";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function Dashboard() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore();

  // Check auth status on mount
  useEffect(() => {
    const verifyAuth = async () => {
      // If we already have a user and are authenticated, check role
      if (isAuthenticated && user) {
        // Redirect admin users to admin page
        if (user.role === "ADMIN") {
          router.replace("/admin");
          return;
        }
        return;
      }

      const authenticated = await checkAuth();

      if (!authenticated) {
        router.replace("/login");
      } else {
        // Check if the authenticated user is admin
        const updatedUser = useAuthStore.getState().user;
        if (updatedUser?.role === "ADMIN") {
          router.replace("/admin");
        }
      }
    };

    verifyAuth();
  }, [isAuthenticated, user, checkAuth, router]);

  // Show loading while checking authentication
  if (isLoading || (!isAuthenticated && !user)) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
        <div className="ml-4 text-white">Checking authentication...</div>
      </div>
    );
  }

  // Show dashboard if authenticated
  if (isAuthenticated && user) {
    return (
      <div className="h-screen w-screen overflow-hidden">
        <DashboardLayout />
      </div>
    );
  }

  // Fallback - should not reach here
  return null;
}
