"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useUIStore } from "@/store/useStore";
import { Menu, Settings, LogOut, User, MessageSquare } from "lucide-react";
import StatusIndicator from "../ui/StatusIndicator";

export default function Header() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const router = useRouter();
  const { user, logout, updateStatus } = useAuthStore();
  const { toggleSidebar, setActiveModal } = useUIStore();

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      // Still redirect to login even if logout fails
      router.replace("/login");
    }
  };

  const handleStatusChange = async (status) => {
    try {
      await updateStatus(status);
    } catch (error) {
      console.error("Status update failed:", error);
    }
  };

  return (
    <div className="h-16 bg-gray-800 flex items-center justify-between px-4 flex-shrink-0">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2">
          <MessageSquare size={20} className="text-amber-500" />
          <h1 className="text-lg font-semibold">
            Tos<span className="text-amber-500">Chat</span>
          </h1>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 pr-4">
        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user?.fullName}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-black font-semibold">
                  {user?.fullName?.charAt(0).toUpperCase() || "U"}
                </div>
              )}
              <div className="text-left hidden md:block">
                <div className="text-sm font-medium">{user?.fullName}</div>
                <div className="text-xs text-gray-400 flex items-center gap-1">
                  <StatusIndicator status={user?.status} size="xs" />
                  {user?.status?.toLowerCase()}
                </div>
              </div>
            </div>
          </button>

          {/* User Dropdown Menu */}
          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20">
                <div className="p-4 border-b border-gray-700">
                  <div className="font-medium">{user?.fullName}</div>
                  <div className="text-sm text-gray-400">@{user?.username}</div>
                  <div className="text-sm text-gray-400">{user?.email}</div>
                </div>

                {/* Status Options */}
                <div className="p-2">
                  <div className="text-xs text-gray-400 mb-2 px-2">
                    Set Status
                  </div>
                  <button
                    onClick={() => handleStatusChange("ONLINE")}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors ${
                      user?.status === "ONLINE" ? "bg-gray-700" : ""
                    }`}
                  >
                    <StatusIndicator status="ONLINE" size="sm" />
                    <span className="text-sm">Online</span>
                  </button>
                  <button
                    onClick={() => handleStatusChange("AWAY")}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors ${
                      user?.status === "AWAY" ? "bg-gray-700" : ""
                    }`}
                  >
                    <StatusIndicator status="AWAY" size="sm" />
                    <span className="text-sm">Away</span>
                  </button>
                  <button
                    onClick={() => handleStatusChange("OFFLINE")}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors ${
                      user?.status === "OFFLINE" ? "bg-gray-700" : ""
                    }`}
                  >
                    <StatusIndicator status="OFFLINE" size="sm" />
                    <span className="text-sm">Offline</span>
                  </button>
                </div>

                <div className="border-t border-gray-700 p-2">
                  <button
                    onClick={() => {
                      setActiveModal("profile");
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm"
                  >
                    <User size={16} />
                    Profile Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm text-red-400 hover:text-white"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
