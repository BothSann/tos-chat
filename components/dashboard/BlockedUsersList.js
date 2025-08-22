"use client";

import { useEffect, useState } from "react";
import { useContactStore, useUIStore } from "@/store/useStore";
import { UserX, Search, MoreVertical, UserCheck, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function BlockedUsersList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showMenuId, setShowMenuId] = useState(null);
  const {
    blockedUsers = [],
    loadBlockedUsers = () => Promise.resolve(),
    unblockUser = () => Promise.resolve(),
  } = useContactStore();
  const { addNotification } = useUIStore();

  useEffect(() => {
    loadBlockedUsers().catch((error) => {
      console.error("Failed to load blocked users:", error);
    });
  }, [loadBlockedUsers]);

  const filteredBlockedUsers = blockedUsers.filter(
    (user) =>
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUnblockUser = async (userId, username) => {
    try {
      await unblockUser(userId);
      addNotification({
        type: "success",
        title: "User Unblocked",
        message: `${username} has been unblocked`,
        duration: 3000,
      });
      setShowMenuId(null);
    } catch (error) {
      addNotification({
        type: "error",
        title: "Failed to Unblock User",
        message: error.message || "Please try again",
        duration: 5000,
      });
    }
  };

  const formatBlockedDate = (timestamp) => {
    if (!timestamp) return "Unknown date";

    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return "Unknown date";
      }
      return format(date, "MMM dd, yyyy");
    } catch (error) {
      console.warn("Invalid blocked date timestamp:", timestamp, error);
      return "Unknown date";
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            <UserX size={18} className="text-red-400" />
            Blocked Users
          </h2>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search blocked users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Blocked Users List */}
      <div className="flex-1 overflow-y-auto">
        {filteredBlockedUsers.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            {searchTerm ? (
              <p className="text-sm">
                No blocked users found matching &quot;{searchTerm}&quot;
              </p>
            ) : (
              <>
                <div className="mb-4 text-4xl opacity-50">🚫</div>
                <p className="text-sm mb-2">No blocked users</p>
                <p className="text-xs text-gray-500 px-4">
                  Users you block will appear here. You can unblock them
                  anytime.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredBlockedUsers.map((user) => (
              <div
                key={user.id}
                className="p-4 hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.fullName}
                        className="w-10 h-10 rounded-full object-cover opacity-50"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-red-500 opacity-50 flex items-center justify-center text-white font-semibold">
                        {user.fullName?.charAt(0).toUpperCase() ||
                          user.username?.charAt(0).toUpperCase() ||
                          "?"}
                      </div>
                    )}

                    {/* Blocked indicator */}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center">
                      <UserX size={10} className="text-white" />
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-300 truncate">
                        {user.fullName || user.username || "Unknown User"}
                      </h3>
                    </div>

                    <div className="text-sm text-gray-400">
                      @{user.username || "unknown"}
                    </div>

                    {user.blockedAt && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <Calendar size={10} />
                        <span>Blocked {formatBlockedDate(user.blockedAt)}</span>
                      </div>
                    )}

                    {user.blockReason && (
                      <div className="text-xs text-red-400 mt-1 truncate">
                        Reason: {user.blockReason}
                      </div>
                    )}
                  </div>

                  {/* Actions Menu */}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setShowMenuId(showMenuId === user.id ? null : user.id)
                      }
                      className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {showMenuId === user.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowMenuId(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20">
                          <button
                            onClick={() =>
                              handleUnblockUser(
                                user.id,
                                user.username || user.fullName
                              )
                            }
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-green-600 transition-colors text-sm text-green-400 hover:text-white"
                          >
                            <UserCheck size={14} />
                            Unblock User
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
