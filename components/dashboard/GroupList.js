"use client";

import { useState } from "react";
import {
  useGroupStore,
  useUIStore,
  useChatStore,
  useAuthStore,
} from "@/store/useStore";
import { Plus, Search, Users, Lock, Globe, RefreshCw } from "lucide-react";
import StatusIndicator from "../ui/StatusIndicator";

export default function GroupList() {
  const [searchTerm, setSearchTerm] = useState("");
  const { groups, loadGroups } = useGroupStore();
  const { setActiveModal } = useUIStore();
  const { setActiveConversation } = useChatStore();
  const { user } = useAuthStore();

  const filteredGroups = groups.filter((group) =>
    group.groupName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleJoinGroup = (group) => {
    const conversation = {
      id: `group-${group.id}`,
      type: "group",
      name: group.groupName,
      avatar: group.avatarUrl,
      memberCount: group.memberCount,
      group: group,
    };
    setActiveConversation(conversation);
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "OWNER":
        return "👑";
      case "ADMIN":
        return "⚡";
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Groups</h2>
          <div className="flex gap-1">
            <button
              onClick={() => {
                console.log("🔄 Manual group refresh triggered");
                loadGroups();
              }}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-blue-400"
              title="Refresh groups"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={() => setActiveModal("createGroup")}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-amber-500"
              title="Create group"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Group List */}
      <div className="flex-1 overflow-y-auto">
        {filteredGroups.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            {searchTerm ? (
              <p className="text-sm">
                No groups found matching &quot;{searchTerm}&quot;
              </p>
            ) : (
              <>
                <div className="mb-4 text-4xl opacity-50">👥</div>
                <p className="text-sm mb-2">No groups yet</p>
                <p className="text-xs text-gray-500 mb-4 px-4">
                  Create a group to chat with multiple friends at once!
                </p>
                <button
                  onClick={() => setActiveModal("createGroup")}
                  className="mt-2 px-4 py-2 bg-amber-500 text-black rounded-lg hover:bg-amber-400 transition-colors text-sm font-medium"
                >
                  🎉 Create Your First Group
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredGroups.map((group) => (
              <button
                key={group.id}
                onClick={() => handleJoinGroup(group)}
                className="w-full p-4 text-left hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {group.avatarUrl ? (
                      <img
                        src={group.avatarUrl}
                        alt={group.groupName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                        {group.groupName.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Privacy indicator */}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
                      {group.isPrivate ? (
                        <Lock size={12} className="text-white" />
                      ) : (
                        <Globe size={12} className="text-white" />
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">
                        {group.groupName}
                      </h3>
                      {getRoleIcon(group.userRole) && (
                        <span className="text-sm" title={group.userRole}>
                          {getRoleIcon(group.userRole)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Users size={12} />
                      <span>{group.memberCount} members</span>
                      {group.isPrivate && (
                        <>
                          <span>•</span>
                          <Lock size={12} />
                          <span>Private</span>
                        </>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 mt-1">
                      Owner: {group.ownerUsername}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
