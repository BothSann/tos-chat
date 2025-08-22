"use client";

import { useState } from "react";
import { useUIStore, useAuthStore } from "@/store/useStore";
import {
  MessageSquare,
  Users,
  UserPlus,
  Settings,
  Shield,
  UserX,
} from "lucide-react";
import ConversationList from "./ConversationList";
import ContactList from "./ContactList";
import GroupList from "./GroupList";
import BlockedUsersList from "./BlockedUsersList";
import Logo from "@/components/Logo";
import { taprom } from "@/lib/fonts";

export default function Sidebar() {
  const [activeTab, setActiveTab] = useState("conversations");
  const { sidebarOpen, setActiveModal } = useUIStore();
  const { user } = useAuthStore();

  const tabs = [
    { id: "conversations", label: "Chats", icon: MessageSquare },
    { id: "contacts", label: "Contacts", icon: UserPlus },
    { id: "groups", label: "Groups", icon: Users },
    { id: "blocked", label: "Blocked", icon: UserX },
  ];

  if (!sidebarOpen) {
    return (
      <div className="w-16 bg-gray-800 border-r border-gray-700 h-full flex flex-col">
        <div className="p-3 border-b border-gray-700 flex items-center justify-center">
          <div
            className={`${taprom.className} w-9 h-9 bg-amber-500 rounded-full flex items-center justify-center text-sm text-black`}
          >
            តោះ
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-2 p-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`p-3 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? "bg-amber-500 text-black"
                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
                title={tab.label}
              >
                <Icon size={20} />
              </button>
            );
          })}
        </div>

        <div className="p-3 border-t border-gray-700 flex flex-col gap-2">
          <button
            onClick={() => setActiveModal("settings")}
            className="p-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            title="Settings"
          >
            <Settings size={20} />
          </button>

          {user?.role === "ADMIN" && (
            <button
              onClick={() => setActiveModal("admin")}
              className="p-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              title="Admin Panel"
            >
              <Shield size={20} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-800 border-r border-gray-700 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Logo textSize="text-2xl" />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <div className="flex w-full">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1 py-3 px-1 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? "text-amber-500 border-b-2 border-amber-500 bg-gray-700/50"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "conversations" && <ConversationList />}
        {activeTab === "contacts" && <ContactList />}
        {activeTab === "groups" && <GroupList />}
        {activeTab === "blocked" && <BlockedUsersList />}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 flex gap-2">
        {user?.role === "ADMIN" && (
          <button
            onClick={() => setActiveModal("admin")}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <Shield size={16} />
            Admin
          </button>
        )}
      </div>
    </div>
  );
}
