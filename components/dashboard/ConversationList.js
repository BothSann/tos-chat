"use client";

import { useEffect, useState } from "react";
import {
  useContactStore,
  useGroupStore,
  useChatStore,
  useAuthStore,
  useUIStore,
} from "@/store/useStore";
import { formatDistanceToNow } from "date-fns";
import StatusIndicator from "../ui/StatusIndicator";
import { Users, User, Search, MessageSquarePlus, Check } from "lucide-react";
import { apiService } from "@/services/api";

export default function ConversationList() {
  const { contacts } = useContactStore();
  const { groups } = useGroupStore();
  const { messages, activeConversation, setActiveConversation, unreadCounts } =
    useChatStore();
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Function to preload last messages for conversations
  const preloadLastMessages = async () => {
    if (isLoadingMessages) return; // Prevent multiple simultaneous loads

    setIsLoadingMessages(true);
    try {
      const messagePromises = [];

      // Preload last message for each contact
      contacts.forEach((contact) => {
        if (contact && contact.id && contact.username) {
          const conversationId = `user-${contact.id}`;
          // Only load if we don't already have messages for this conversation
          if (
            !messages[conversationId] ||
            messages[conversationId].length === 0
          ) {
            messagePromises.push(
              apiService
                .getPrivateMessages(contact.id, 0, 1)
                .then((response) => ({
                  conversationId,
                  messages: response.success ? response.data.messages : [],
                  type: "private",
                }))
                .catch((error) => {
                  console.error(
                    `Failed to load messages for contact ${contact.id}:`,
                    error
                  );
                  return { conversationId, messages: [], type: "private" };
                })
            );
          }
        }
      });

      // Preload last message for each group
      groups.forEach((group) => {
        if (group && group.id && group.groupName) {
          const conversationId = `group-${group.id}`;
          // Only load if we don't already have messages for this conversation
          if (
            !messages[conversationId] ||
            messages[conversationId].length === 0
          ) {
            messagePromises.push(
              apiService
                .getGroupMessages(group.id, 0, 1)
                .then((response) => ({
                  conversationId,
                  messages: response.success ? response.data.messages : [],
                  type: "group",
                }))
                .catch((error) => {
                  console.error(
                    `Failed to load messages for group ${group.id}:`,
                    error
                  );
                  return { conversationId, messages: [], type: "group" };
                })
            );
          }
        }
      });

      if (messagePromises.length > 0) {
        console.log(
          `ConversationList: Loading last messages for ${messagePromises.length} conversations...`
        );
        const results = await Promise.all(messagePromises);

        // Update the store with the loaded messages
        const { loadMessages } = useChatStore.getState();
        results.forEach(
          ({ conversationId, messages: conversationMessages }) => {
            if (conversationMessages.length > 0) {
              loadMessages(conversationId, conversationMessages);
            }
          }
        );
      }
    } catch (error) {
      console.error("Error preloading last messages:", error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Load last messages when contacts or groups change
  useEffect(() => {
    if ((contacts.length > 0 || groups.length > 0) && !isLoadingMessages) {
      preloadLastMessages();
    }
  }, [contacts, groups]); // Only depend on contacts and groups, not messages

  // REMOVED: Auto-refresh for conversation list to eliminate all flickering
  // WebSocket should handle real-time conversation updates

  useEffect(() => {
    const allConversations = [];

    // Add private conversations (contacts)
    contacts.forEach((contact) => {
      // Skip null or invalid contacts
      if (!contact || !contact.id || !contact.username) {
        console.warn("ConversationList: Skipping invalid contact:", contact);
        return;
      }

      const conversationId = `user-${contact.id}`;
      const conversationMessages = messages[conversationId] || [];
      const lastMessage = conversationMessages[conversationMessages.length - 1];
      const unreadCount = unreadCounts[conversationId] || 0;

      allConversations.push({
        id: conversationId,
        type: "private",
        name: contact.fullName || contact.username || "Unknown User",
        username: contact.username,
        avatar: contact.avatarUrl,
        status: contact.status || "OFFLINE",
        lastMessage: lastMessage
          ? {
              ...lastMessage,
              senderName:
                lastMessage.senderId === user?.id
                  ? "You"
                  : contact.fullName || contact.username || "Unknown",
            }
          : null,
        unreadCount,
        user: contact,
      });
    });

    // Add group conversations
    groups.forEach((group) => {
      // Skip null or invalid groups
      if (!group || !group.id || !group.groupName) {
        console.warn("ConversationList: Skipping invalid group:", group);
        return;
      }

      const conversationId = `group-${group.id}`;
      const conversationMessages = messages[conversationId] || [];
      const lastMessage = conversationMessages[conversationMessages.length - 1];
      const unreadCount = unreadCounts[conversationId] || 0;

      allConversations.push({
        id: conversationId,
        type: "group",
        name: group.groupName,
        avatar: group.avatarUrl,
        memberCount: group.memberCount || 0,
        lastMessage: lastMessage
          ? {
              ...lastMessage,
              senderName:
                lastMessage.senderId === user?.id
                  ? "You"
                  : lastMessage.senderFullName || "Unknown",
            }
          : null,
        unreadCount,
        group,
      });
    });

    // Sort by last message timestamp
    allConversations.sort((a, b) => {
      const aTime = a.lastMessage
        ? new Date(a.lastMessage.timestamp)
        : new Date(0);
      const bTime = b.lastMessage
        ? new Date(b.lastMessage.timestamp)
        : new Date(0);
      return bTime - aTime;
    });

    setConversations(allConversations);
  }, [contacts, groups, messages, unreadCounts, user]);

  const handleConversationClick = (conversation) => {
    if (isBulkMode) {
      handleUserSelection(conversation);
    } else {
      setActiveConversation(conversation);
    }
  };

  const handleUserSelection = (conversation) => {
    // Only allow selection of private conversations for bulk messaging
    if (conversation.type !== "private") return;

    const userId = conversation.user.id;
    setSelectedUsers((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleBulkMode = () => {
    setIsBulkMode(!isBulkMode);
    setSelectedUsers([]);
  };

  const handleBulkMessage = () => {
    if (selectedUsers.length === 0) return;
    setShowBulkModal(true);
  };

  const filteredConversations = conversations.filter((conversation) =>
    conversation.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return "";

    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return "";
      }
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.warn("Invalid conversation timestamp:", timestamp, error);
      return "";
    }
  };

  const truncateMessage = (message, maxLength = 50) => {
    if (!message || !message.content) return "";

    let displayContent = message.content;

    // Handle special message types
    if (message.type === "IMAGE") {
      displayContent = `📷 Image${
        message.fileName ? `: ${message.fileName}` : ""
      }`;
    } else if (message.type === "FILE") {
      displayContent = `📎 File${
        message.fileName ? `: ${message.fileName}` : ""
      }`;
    }

    return displayContent.length > maxLength
      ? displayContent.substring(0, maxLength) + "..."
      : displayContent;
  };

  if (isLoadingMessages) {
    return (
      <div className="p-4 text-center text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-3"></div>
        <p className="text-sm">Loading conversations...</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="h-full flex flex-col">
        {/* Header with search and bulk message */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Chats</h2>
            <button
              onClick={handleBulkMode}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-amber-500"
              title="Bulk Message"
            >
              <MessageSquarePlus size={18} />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4 text-center text-gray-400">
          <div>
            <div className="mb-4 text-4xl opacity-50">💬</div>
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">
              Add contacts or join groups to start chatting
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with search and bulk message */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Chats</h2>
          <button
            onClick={handleBulkMode}
            className={`p-2 hover:bg-gray-700 rounded-lg transition-colors ${
              isBulkMode ? "bg-amber-500 text-black" : "text-amber-500"
            }`}
            title={isBulkMode ? "Exit Bulk Mode" : "Bulk Message"}
          >
            <MessageSquarePlus size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Bulk mode actions */}
        {isBulkMode && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-gray-400">
              {selectedUsers.length} users selected
            </span>
            {selectedUsers.length > 0 && (
              <button
                onClick={handleBulkMessage}
                className="px-3 py-1 bg-amber-500 text-black rounded text-sm font-medium hover:bg-amber-400 transition-colors"
              >
                Send Message
              </button>
            )}
          </div>
        )}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            {searchTerm ? (
              <p className="text-sm">
                No conversations found matching &quot;{searchTerm}&quot;
              </p>
            ) : (
              <>
                <div className="mb-4 text-4xl opacity-50">💬</div>
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs mt-1">
                  Add contacts or join groups to start chatting
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => handleConversationClick(conversation)}
                className={`w-full p-4 text-left hover:bg-gray-700 transition-colors ${
                  activeConversation?.id === conversation.id
                    ? "bg-gray-700"
                    : ""
                } ${
                  isBulkMode &&
                  conversation.type === "private" &&
                  selectedUsers.includes(conversation.user.id)
                    ? "bg-amber-500/20 border-l-4 border-amber-500"
                    : ""
                } ${
                  isBulkMode && conversation.type !== "private"
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                disabled={isBulkMode && conversation.type !== "private"}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {conversation.avatar ? (
                      <img
                        src={conversation.avatar}
                        alt={conversation.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center text-black font-semibold">
                        {conversation.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Status indicator for private chats */}
                    {conversation.type === "private" && (
                      <div className="absolute -right-0.5 bottom-0.5">
                        <StatusIndicator
                          status={conversation.status}
                          size="sm"
                        />
                      </div>
                    )}

                    {/* Group indicator */}
                    {conversation.type === "group" && !isBulkMode && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
                        <Users size={12} className="text-white" />
                      </div>
                    )}

                    {/* Selection indicator in bulk mode */}
                    {isBulkMode && conversation.type === "private" && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center">
                        {selectedUsers.includes(conversation.user.id) ? (
                          <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                            <Check size={12} className="text-black" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 border-2 border-gray-400 rounded-full bg-gray-800"></div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium truncate">
                        {conversation.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        {conversation.lastMessage && (
                          <span className="text-xs text-gray-400">
                            {formatLastMessageTime(
                              conversation.lastMessage.timestamp
                            )}
                          </span>
                        )}
                        {conversation.unreadCount > 0 && (
                          <div className="bg-amber-500 text-black text-xs font-bold px-2 py-1 rounded-full min-w-[20px] flex items-center justify-center">
                            {conversation.unreadCount > 99
                              ? "99+"
                              : conversation.unreadCount}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {conversation.type === "private" && (
                        <User
                          size={12}
                          className="text-gray-400 flex-shrink-0"
                        />
                      )}
                      {conversation.type === "group" && (
                        <Users
                          size={12}
                          className="text-gray-400 flex-shrink-0"
                        />
                      )}

                      {conversation.lastMessage ? (
                        <p className="text-sm text-gray-400 truncate">
                          <span className="font-medium">
                            {conversation.lastMessage.senderName}:
                          </span>{" "}
                          {truncateMessage(conversation.lastMessage)}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500 italic">
                          {conversation.type === "group"
                            ? `${conversation.memberCount} members`
                            : "No messages yet"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bulk Message Modal */}
      {showBulkModal && (
        <BulkMessageModal
          selectedUsers={selectedUsers
            .map((userId) => {
              const conversation = conversations.find(
                (c) => c.type === "private" && c.user.id === userId
              );
              return conversation ? conversation.user : null;
            })
            .filter(Boolean)}
          onClose={() => {
            setShowBulkModal(false);
            setIsBulkMode(false);
            setSelectedUsers([]);
          }}
        />
      )}
    </div>
  );
}

// Bulk Message Modal Component
function BulkMessageModal({ selectedUsers, onClose }) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { addNotification } = useUIStore();

  const handleSend = async () => {
    if (!message.trim() || isSending) return;

    setIsSending(true);
    try {
      const promises = selectedUsers.map((user) =>
        apiService
          .sendPrivateMessage({
            recipientId: user.id,
            content: message.trim(),
            type: "TEXT",
          })
          .catch((error) => ({
            error: true,
            user,
            message: error.message,
          }))
      );

      const results = await Promise.all(promises);
      const failed = results.filter((result) => result?.error);
      const successful = results.length - failed.length;

      if (failed.length === 0) {
        addNotification({
          type: "success",
          title: "Bulk Message Sent",
          message: `Message sent to all ${selectedUsers.length} users`,
          duration: 4000,
        });
      } else if (successful > 0) {
        addNotification({
          type: "warning",
          title: "Partially Sent",
          message: `Message sent to ${successful}/${selectedUsers.length} users. ${failed.length} failed.`,
          duration: 5000,
        });
      } else {
        addNotification({
          type: "error",
          title: "Failed to Send Messages",
          message: "All messages failed to send. Please try again.",
          duration: 5000,
        });
      }

      // Close modal even if some failed, since user should see the notification
      if (successful > 0) {
        onClose();
      }
    } catch (error) {
      addNotification({
        type: "error",
        title: "Failed to Send Messages",
        message: error.message || "Please try again",
        duration: 5000,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-lg">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            Send Bulk Message
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Send to {selectedUsers.length} selected users
          </p>
        </div>

        {/* Selected Users */}
        <div className="p-4 border-b border-gray-700 max-h-32 overflow-y-auto">
          <div className="flex flex-wrap gap-2">
            {selectedUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-1 bg-amber-500/20 px-2 py-1 rounded-full text-sm"
              >
                <span>{user.fullName || user.username}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Message Input */}
        <div className="p-6">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="w-full h-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 resize-none"
            maxLength={1000}
          />
          <div className="text-xs text-gray-400 mt-1">
            {message.length}/1000 characters
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-700 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            disabled={isSending}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            className="px-4 py-2 bg-amber-500 text-black rounded-lg hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSending ? "Sending..." : `Send to ${selectedUsers.length} users`}
          </button>
        </div>
      </div>
    </div>
  );
}
