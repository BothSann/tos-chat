"use client";

import { useState } from "react";
import {
  MoreVertical,
  Users,
  User,
  Phone,
  Video,
  Settings,
  Trash2,
  Shield,
} from "lucide-react";
import StatusIndicator from "../ui/StatusIndicator";
import { useChatStore, useUIStore, useContactStore } from "@/store/useStore";

export default function ChatHeader({ conversation }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { deleteChat, setActiveConversation } = useChatStore();
  const { addNotification } = useUIStore();
  const { blockUser, loadContacts } = useContactStore();

  const handleDeleteChat = async () => {
    try {
      const isGroup = conversation.type === "group";
      await deleteChat(conversation);
      addNotification({
        type: "success",
        title: "Chat Deleted",
        message: `${
          isGroup ? "Group" : "Private"
        } chat history has been cleared for you only`,
        duration: 3000,
      });
      setShowMenu(false);
      setShowDeleteConfirm(false);
    } catch (error) {
      addNotification({
        type: "error",
        title: "Failed to Delete Chat",
        message: error.message || "Please try again",
        duration: 5000,
      });
    }
  };

  const handleBlockUser = async () => {
    try {
      const username = conversation.user?.username;
      const displayName = conversation.user?.fullName || username;

      if (!username) {
        addNotification({
          type: "error",
          title: "Error",
          message: "Unable to block user - user information not available",
          duration: 5000,
        });
        return;
      }

      // Block the user
      await blockUser(username, "Blocked from chat");

      // Delete the chat conversation
      await deleteChat(conversation);

      // Refresh contacts list to remove blocked user
      await loadContacts();

      // Clear the active conversation to go back to main view
      setActiveConversation(null);

      addNotification({
        type: "success",
        title: "User Blocked",
        message: `${displayName} has been blocked and chat deleted`,
        duration: 4000,
      });

      setShowMenu(false);
    } catch (error) {
      addNotification({
        type: "error",
        title: "Failed to Block User",
        message: error.message || "Please try again",
        duration: 5000,
      });
    }
  };

  if (!conversation) return null;

  const isGroup = conversation.type === "group";

  return (
    <div className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6">
      {/* Left side - Conversation info */}
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="relative">
          {conversation.avatar ? (
            <img
              src={conversation.avatar}
              alt={conversation.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                isGroup ? "bg-blue-500" : "bg-amber-500"
              }`}
            >
              {conversation.name.charAt(0).toUpperCase()}
            </div>
          )}

          {!isGroup && (
            <div className="absolute bottom-0.25 right-0.5">
              <StatusIndicator status={conversation.status} size="xs" />
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <h2 className="font-semibold text-white">{conversation.name}</h2>
          <div className="flex items-center gap-1 text-sm text-gray-400">
            {isGroup ? (
              <>
                <Users size={12} />
                <span>{conversation.memberCount} members</span>
              </>
            ) : (
              <>
                <User size={12} />
                <span>@{conversation.username}</span>
                {conversation.status && (
                  <>
                    <span>•</span>
                    <span
                      className={`${
                        conversation.status === "ONLINE"
                          ? "text-green-400"
                          : conversation.status === "AWAY"
                          ? "text-yellow-400"
                          : "text-gray-400"
                      }`}
                    >
                      {conversation.status.toLowerCase()}
                    </span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        {/* Call buttons for private chats */}
        {!isGroup && (
          <>
            <button
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
              title="Voice call"
              disabled
            >
              <Phone size={18} />
            </button>
            <button
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
              title="Video call"
              disabled
            >
              <Video size={18} />
            </button>
          </>
        )}

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <MoreVertical size={18} />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20">
                {isGroup ? (
                  <>
                    <button className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700 transition-colors text-sm">
                      <Users size={14} />
                      View Members
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700 transition-colors text-sm">
                      <Settings size={14} />
                      Group Settings
                    </button>
                    <div className="border-t border-gray-600 my-1"></div>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-600 transition-colors text-sm text-red-400 hover:text-white"
                    >
                      <Trash2 size={14} />
                      Delete Chat
                    </button>
                  </>
                ) : (
                  <>
                    <button className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700 transition-colors text-sm">
                      <User size={14} />
                      View Profile
                    </button>
                    <div className="border-t border-gray-600 my-1"></div>
                    <button
                      onClick={handleBlockUser}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-600 transition-colors text-sm text-orange-400 hover:text-white"
                    >
                      <Shield size={14} />
                      Block User
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-600 transition-colors text-sm text-red-400 hover:text-white"
                    >
                      <Trash2 size={14} />
                      Delete Chat
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              Delete Chat
            </h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this chat? This will clear all
              messages for you only. The other person will still see the
              conversation.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteChat}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
