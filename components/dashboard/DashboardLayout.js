"use client";

import { useEffect, useState } from "react";
import {
  useAuthStore,
  useChatStore,
  useContactStore,
  useGroupStore,
  useUIStore,
} from "@/store/useStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import Sidebar from "./Sidebar";
import ChatArea from "../chat/ChatArea";
import Header from "./Header";
import NotificationToast from "../ui/NotificationToast";
import AddContactModal from "./AddContactModal";
import CreateGroupModal from "./CreateGroupModal";
import ProfileSettings from "./ProfileSettings";
import { taprom } from "@/lib/fonts";

export default function DashboardLayout() {
  const { user } = useAuthStore();
  const { activeConversation } = useChatStore();
  const { loadContacts } = useContactStore();
  const { loadGroups } = useGroupStore();
  const { sidebarOpen, notifications, activeModal, setActiveModal } =
    useUIStore();
  const { connect } = useWebSocket();

  useEffect(() => {
    const initializeApp = async () => {
      // Don't call checkAuth here as it's already handled by AuthGuard
      try {
        const [contactsResult, groupsResult] = await Promise.all([
          loadContacts(),
          loadGroups(),
        ]);

        // Only connect WebSocket if data loading was successful
        if (contactsResult !== false && groupsResult !== false) {
          connect();
        }
      } catch (error) {
        console.error("Failed to initialize app data:", error);
      }
    };

    if (user) {
      initializeApp();
    }
  }, [user, loadContacts, loadGroups, connect]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[auto_1fr] h-screen bg-gray-900">
      {/* Sidebar */}
      <div
        className={`transition-all duration-300 ${
          sidebarOpen ? "w-80" : "w-16"
        }`}
      >
        <Sidebar />
      </div>

      {/* Main Content Area - This is your second grid column */}
      <div className="flex flex-col h-screen min-w-0">
        {activeConversation ? (
          <>
            {/* Header - Fixed at top */}
            <div className="flex-shrink-0">
              <Header />
            </div>

            {/* Chat Area - Scrollable content */}
            <div className="flex-1 overflow-hidden">
              <ChatArea />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="mb-4 text-6xl opacity-50">💬</div>
              <h2 className="text-2xl font-semibold mb-2 text-gray-300">
                Welcome to <span className={taprom.className}>តោះឆាត</span>
              </h2>
              <p className="text-gray-500">
                Select a conversation to start messaging
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Notifications - Fixed Position */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <NotificationToast
            key={notification.id}
            notification={notification}
          />
        ))}
      </div>

      {/* Modals */}
      <AddContactModal
        isOpen={activeModal === "addContact"}
        onClose={() => setActiveModal(null)}
      />
      <CreateGroupModal
        isOpen={activeModal === "createGroup"}
        onClose={() => setActiveModal(null)}
      />
      <ProfileSettings
        isOpen={activeModal === "profile"}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
}
