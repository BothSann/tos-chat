"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useAdminStore, useUIStore } from "@/store/useStore";
import {
  Users,
  UserX,
  Shield,
  ChevronLeft,
  ChevronRight,
  Search,
  AlertTriangle,
  CheckCircle,
  LogOut,
} from "lucide-react";
import Logo from "@/components/Logo";

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, checkAuth, logout } = useAuthStore();
  const { addNotification } = useUIStore();
  const {
    users,
    bannedUsers,
    systemStats,
    isLoading,
    totalPages,
    currentPage,
    bannedTotalPages,
    bannedCurrentPage,
    loadUsers,
    loadBannedUsers,
    banUser,
    unbanUser,
    loadSystemStats,
  } = useAdminStore();

  const [activeTab, setActiveTab] = useState("users");
  const [searchTerm, setSearchTerm] = useState("");
  const [banReason, setBanReason] = useState("");
  const [userToBan, setUserToBan] = useState(null);

  const handleLogout = async () => {
    try {
      await logout();
      addNotification({
        type: "success",
        title: "Logged out",
        message: "Successfully logged out",
        duration: 3000,
      });
      router.push("/login");
    } catch (error) {
      addNotification({
        type: "error",
        title: "Logout failed",
        message: "Failed to logout properly",
        duration: 3000,
      });
      // Force redirect anyway
      router.push("/login");
    }
  };

  // Check admin access
  useEffect(() => {
    const verifyAdminAccess = async () => {
      try {
        if (!isAuthenticated || !user) {
          const authenticated = await checkAuth();
          if (!authenticated) {
            router.replace("/login");
            return;
          }
          // After checkAuth, get the updated user from store
          const updatedUser = useAuthStore.getState().user;
          if (updatedUser && updatedUser.role !== "ADMIN") {
            addNotification({
              type: "error",
              title: "Access Denied",
              message: "You don't have admin privileges",
              duration: 5000,
            });
            router.replace("/dashboard");
            return;
          }
        } else {
          // User is authenticated, check admin status
          if (user.role !== "ADMIN") {
            addNotification({
              type: "error",
              title: "Access Denied",
              message: "You don't have admin privileges",
              duration: 5000,
            });
            router.replace("/dashboard");
            return;
          }
        }
      } catch (error) {
        console.error("Admin access verification failed:", error);
        router.replace("/login");
      }
    };

    verifyAdminAccess();
  }, [isAuthenticated, user, checkAuth, router, addNotification]);

  // Load initial data
  useEffect(() => {
    if (user && user.role === "ADMIN") {
      loadUsers(0, 10);
      loadBannedUsers(0, 10);
      loadSystemStats();
    }
  }, [user, loadUsers, loadBannedUsers, loadSystemStats]);

  const handleBanUser = async (userId) => {
    if (!banReason.trim()) {
      addNotification({
        type: "error",
        title: "Error",
        message: "Please provide a reason for banning",
        duration: 3000,
      });
      return;
    }

    try {
      await banUser(userId, banReason);
      addNotification({
        type: "success",
        title: "User Banned",
        message: "User has been banned successfully",
        duration: 3000,
      });
      setUserToBan(null);
      setBanReason("");
      // Reload users to reflect changes
      loadUsers(currentPage, 10);
      loadBannedUsers(bannedCurrentPage, 10);
    } catch (error) {
      addNotification({
        type: "error",
        title: "Error",
        message: error.message || "Failed to ban user",
        duration: 5000,
      });
    }
  };

  const handleUnbanUser = async (userId) => {
    try {
      await unbanUser(userId);
      addNotification({
        type: "success",
        title: "User Unbanned",
        message: "User has been unbanned successfully",
        duration: 3000,
      });
      // Reload users to reflect changes
      loadUsers(currentPage, 10);
      loadBannedUsers(bannedCurrentPage, 10);
    } catch (error) {
      addNotification({
        type: "error",
        title: "Error",
        message: error.message || "Failed to unban user",
        duration: 5000,
      });
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredBannedUsers = bannedUsers.filter(
    (user) =>
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
        <div className="ml-4 text-white">Checking permissions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-amber-500" />
            <Logo textSize={"text-2xl"} />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-300">
              Welcome, {user.fullName}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors duration-200"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats Cards */}
        {systemStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <h3 className="text-lg font-semibold">Total Users</h3>
                  <p className="text-2xl font-bold text-blue-500">
                    {systemStats.totalUsers || 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="flex items-center gap-3">
                <UserX className="h-8 w-8 text-red-500" />
                <div>
                  <h3 className="text-lg font-semibold">Banned Users</h3>
                  <p className="text-2xl font-bold text-red-500">
                    {systemStats.bannedUsers || 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <h3 className="text-lg font-semibold">Active Users</h3>
                  <p className="text-2xl font-bold text-green-500">
                    {systemStats.activeUsers || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-md font-medium ${
              activeTab === "users"
                ? "bg-amber-500 text-black"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            All Users
          </button>
          <button
            onClick={() => setActiveTab("banned")}
            className={`px-4 py-2 rounded-md font-medium ${
              activeTab === "banned"
                ? "bg-amber-500 text-black"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            Banned Users
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {isLoading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500"></div>
                        <span className="ml-2">Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  (activeTab === "users"
                    ? filteredUsers
                    : filteredBannedUsers
                  ).map((user) => (
                    <tr key={user.id} className="hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-300">
                                {user.fullName?.charAt(0) ||
                                  user.username?.charAt(0) ||
                                  "U"}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">
                              {user.fullName || "No name"}
                            </div>
                            <div className="text-sm text-gray-400">
                              @{user.username}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {user.email || "No email"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.isBanned
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {user.isBanned ? "Banned" : "Active"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {user.role || "USER"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {activeTab === "users" &&
                          !user.isBanned &&
                          user.id !== useAuthStore.getState().user?.id && (
                            <button
                              onClick={() => setUserToBan(user)}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors duration-200 mr-3 cursor-pointers"
                            >
                              Ban User
                            </button>
                          )}
                        {activeTab === "banned" && (
                          <button
                            onClick={() => handleUnbanUser(user.id)}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors duration-200"
                          >
                            Unban User
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(activeTab === "users" ? totalPages : bannedTotalPages) > 1 && (
            <div className="bg-gray-700 px-6 py-3 flex items-center justify-between">
              <div className="text-sm text-gray-300">
                Page{" "}
                {(activeTab === "users" ? currentPage : bannedCurrentPage) + 1}{" "}
                of {activeTab === "users" ? totalPages : bannedTotalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const page =
                      activeTab === "users" ? currentPage : bannedCurrentPage;
                    if (page > 0) {
                      if (activeTab === "users") {
                        loadUsers(page - 1, 10);
                      } else {
                        loadBannedUsers(page - 1, 10);
                      }
                    }
                  }}
                  disabled={
                    (activeTab === "users"
                      ? currentPage
                      : bannedCurrentPage) === 0
                  }
                  className="px-3 py-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    const page =
                      activeTab === "users" ? currentPage : bannedCurrentPage;
                    const totalPgs =
                      activeTab === "users" ? totalPages : bannedTotalPages;
                    if (page < totalPgs - 1) {
                      if (activeTab === "users") {
                        loadUsers(page + 1, 10);
                      } else {
                        loadBannedUsers(page + 1, 10);
                      }
                    }
                  }}
                  disabled={
                    (activeTab === "users" ? currentPage : bannedCurrentPage) >=
                    (activeTab === "users" ? totalPages : bannedTotalPages) - 1
                  }
                  className="px-3 py-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ban User Modal */}
      {userToBan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <h3 className="text-lg font-semibold">Ban User</h3>
            </div>
            <p className="text-gray-300 mb-4">
              Are you sure you want to ban{" "}
              <span className="font-semibold">
                {userToBan.fullName || userToBan.username}
              </span>
              ?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reason for ban
              </label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
                rows="3"
                placeholder="Enter reason for banning this user..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setUserToBan(null);
                  setBanReason("");
                }}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleBanUser(userToBan.id)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-md text-sm font-medium"
              >
                Ban User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
