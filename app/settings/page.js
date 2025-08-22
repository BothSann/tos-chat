"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useStore";
import ProfileSettings from "@/components/dashboard/ProfileSettings";

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    const verifyAuth = async () => {
      if (isAuthenticated && user) {
        return;
      }

      const authenticated = await checkAuth();
      if (!authenticated) {
        router.replace("/login");
      }
    };

    verifyAuth();
  }, [isAuthenticated, user, checkAuth, router]);

  const handleClose = () => {
    router.back();
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
        <div className="ml-4 text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <ProfileSettings isOpen={true} onClose={handleClose} />
    </div>
  );
}
