"use client";

import { useEffect, useRef, useState } from "react";
import { useChatStore, useAuthStore, useContactStore } from "@/store/useStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import { apiService } from "@/services/api";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import ChatHeader from "./ChatHeader";

export default function ChatArea() {
  const {
    activeConversation,
    messages,
    loadMessages,
    clearUnreadCount,
    addMessage,
  } = useChatStore();
  const { user } = useAuthStore();
  const { blockedUsers } = useContactStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockCheckError, setBlockCheckError] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const {
    subscribeToGroup,
    subscribeToPrivateChat,
    unsubscribeFromGroup,
    isConnected,
    connectionState,
    forceReconnect,
    sendMessage: sendWebSocketMessage,
    sendGroupMessage: sendWebSocketGroupMessage,
  } = useWebSocket();
  const messagesEndRef = useRef(null);

  // Generate the correct conversation ID that matches what the store uses
  const getConversationId = (conversation) => {
    if (!conversation) return null;
    if (conversation.type === "group") {
      return `group-${conversation.group.id}`;
    } else {
      return `user-${conversation.user.id}`;
    }
  };

  const conversationId = getConversationId(activeConversation);
  const conversationMessages = conversationId
    ? messages[conversationId] || []
    : [];

  // Check if current user is blocked by the person they're trying to chat with
  const checkIfBlocked = () => {
    if (!activeConversation || activeConversation.type !== "private" || !user) {
      return false;
    }

    // For private conversations, check if the other user has blocked the current user
    // This should ideally be checked via API, but for demo purposes we'll simulate it
    // The backend should handle this and return a blocked status
    return isBlocked;
  };

  // Force re-render when messages change for this conversation
  const messageCount = conversationMessages.length;
  const lastMessageId =
    conversationMessages.length > 0
      ? conversationMessages[conversationMessages.length - 1].id
      : null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Check if current user is blocked when conversation changes
  useEffect(() => {
    const checkBlockedStatus = async () => {
      if (!activeConversation || activeConversation.type !== "private") {
        setIsBlocked(false);
        return;
      }

      try {
        // For now, we'll implement this as a simple state management
        // In a real implementation, this would call the backend API
        // const response = await apiService.checkIfBlocked(activeConversation.user.id);
        // setIsBlocked(response.success && response.data.isBlocked);

        // Reset blocked status for new conversations
        setIsBlocked(false);
        setBlockCheckError(null);
      } catch (error) {
        console.error("Failed to check blocked status:", error);
        setBlockCheckError(error);
      }
    };

    checkBlockedStatus();
  }, [activeConversation]);

  useEffect(() => {
    if (activeConversation) {
      console.log("ChatArea: Active conversation changed:", activeConversation);

      const currentConversationId = getConversationId(activeConversation);

      // Clear unread count
      clearUnreadCount(currentConversationId);

      // Load message history
      loadConversationMessages();

      // Subscribe to real-time updates with a small delay to ensure WebSocket is connected
      const subscribeTimer = setTimeout(() => {
        if (activeConversation.type === "group") {
          subscribeToGroup(activeConversation.group.id);
        } else {
          subscribeToPrivateChat(activeConversation.user.id);
        }
      }, 100); // Small delay to allow WebSocket connection to establish

      return () => {
        clearTimeout(subscribeTimer);
        if (activeConversation?.type === "group") {
          unsubscribeFromGroup(activeConversation.group.id);
        }
      };
    }
  }, [
    activeConversation,
    clearUnreadCount,
    subscribeToGroup,
    subscribeToPrivateChat,
    unsubscribeFromGroup,
  ]);

  // DISABLED: MessageList now handles all scrolling to prevent conflicts
  // useEffect(() => {
  //   scrollToBottom();
  // }, [conversationId]);

  // Smart message sync - checks for new messages and adds them smoothly
  useEffect(() => {
    if (!activeConversation) return;

    const syncMessages = async () => {
      try {
        setIsSyncing(true);
        const {
          messages: currentMessages,
          activeConversation: currentConversation,
        } = useChatStore.getState();
        if (!currentConversation) return;

        const currentConversationId = getConversationId(currentConversation);
        const conversationMessages =
          currentMessages[currentConversationId] || [];

        let response;
        if (currentConversation.type === "group") {
          response = await apiService.getGroupMessages(
            currentConversation.group.id,
            0,
            20
          );
        } else {
          response = await apiService.getPrivateMessages(
            currentConversation.user.id,
            0,
            20
          );
        }

        if (response.success && response.data.messages) {
          const serverMessages = response.data.messages;

          // Find new messages that we don't have locally
          const localMessageIds = new Set(
            conversationMessages.map((m) => m.id)
          );
          const newMessages = serverMessages.filter(
            (msg) => !localMessageIds.has(msg.id)
          );

          if (newMessages.length > 0) {
            console.log(
              `🆕 Found ${newMessages.length} new messages, adding them smoothly`
            );

            // Add each new message individually for smooth appearance
            newMessages.forEach((newMessage) => {
              addMessage(newMessage);
            });

            setLastSyncTime(new Date().toLocaleTimeString());
          }
        }
      } catch (error) {
        console.warn("Message sync failed:", error);
      } finally {
        setIsSyncing(false);
      }
    };

    // Initial sync when conversation changes
    syncMessages();

    // Then sync every 3 seconds for active conversation
    const syncInterval = setInterval(syncMessages, 3000);

    return () => {
      clearInterval(syncInterval);
    };
  }, [activeConversation]);

  const loadConversationMessages = async () => {
    if (!activeConversation) return;

    const currentConversationId = getConversationId(activeConversation);

    try {
      let response;
      if (activeConversation.type === "group") {
        response = await apiService.getGroupMessages(
          activeConversation.group.id,
          0,
          50
        );
      } else {
        response = await apiService.getPrivateMessages(
          activeConversation.user.id,
          0,
          50
        );
      }

      if (response.success) {
        loadMessages(currentConversationId, response.data.messages);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  const handleSendMessage = async (messageData) => {
    if (!activeConversation) return;

    try {
      let response;

      // Handle file uploads differently
      if (messageData.file) {
        const formData = new FormData();
        formData.append("file", messageData.file);
        formData.append("type", messageData.type);

        if (activeConversation.type === "group") {
          response = await apiService.sendGroupFileMessage(
            activeConversation.group.id,
            formData
          );
        } else {
          formData.append(
            "recipientUsername",
            activeConversation.user.username
          );
          response = await apiService.sendPrivateFileMessage(formData);
        }
      } else {
        // Handle text messages
        if (activeConversation.type === "group") {
          console.log("ChatArea: Sending group message:", {
            groupId: activeConversation.group.id,
            messageData: messageData,
            groupInfo: activeConversation.group,
          });

          response = await apiService.sendGroupMessage(
            activeConversation.group.id,
            messageData
          );
        } else {
          const privateMessageData = {
            ...messageData,
            recipientUsername: activeConversation.user.username,
          };
          console.log("ChatArea: Sending private message:", privateMessageData);

          response = await apiService.sendPrivateMessage(privateMessageData);
        }
      }

      console.log(
        "📤 ChatArea: Message sent via API, expecting WebSocket notification from backend..."
      );

      // Add message to local store immediately for instant UI update
      if (response.success && response.data) {
        console.log("ChatArea: API response data:", response.data);

        // Handle different response formats from backend
        if (response.success && response.data) {
          console.log(
            "ChatArea: Response data type:",
            typeof response.data,
            response.data
          );

          // Check if response.data is just an ID (number) or a full message object
          if (
            typeof response.data === "number" ||
            typeof response.data === "string"
          ) {
            // API returned just the message ID, create a temporary message object for immediate display
            const tempMessage = {
              id: response.data,
              content:
                messageData.content ||
                (messageData.file ? messageData.fileName : ""),
              type: messageData.type || "TEXT",
              senderId: user.id,
              senderUsername: user.username,
              senderFullName: user.fullName,
              timestamp: new Date().toISOString(),
              // Add file properties if it's a file message
              ...(messageData.file && {
                fileName: messageData.fileName,
                fileSize: messageData.fileSize,
                mimeType: messageData.mimeType,
                fileUrl: messageData.fileUrl, // Use the fileUrl from the response if available
              }),
              // Add recipientId for private messages
              ...(activeConversation.type === "private" && {
                recipientId: activeConversation.user.id,
                recipientUsername: activeConversation.user.username,
              }),
              // Add groupId for group messages
              ...(activeConversation.type === "group" && {
                groupId: activeConversation.group.id,
                groupName: activeConversation.group.name,
              }),
            };

            console.log(
              "ChatArea: Created temp message for immediate display:",
              tempMessage
            );
            addMessage(tempMessage);
          } else {
            // API returned full message object
            // Ensure the message has the correct recipientId for private messages
            if (
              activeConversation.type === "private" &&
              !response.data.recipientId
            ) {
              response.data.recipientId = activeConversation.user.id;
            }

            console.log(
              "ChatArea: Adding full message to local store:",
              response.data
            );
            addMessage(response.data);
          }
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);

      // Check if the error indicates the user is blocked
      if (
        error.response?.status === 403 ||
        error.response?.data?.message?.includes("blocked") ||
        error.response?.data?.message?.includes("Blocked")
      ) {
        console.log("User is blocked, updating state");
        setIsBlocked(true);
      }

      throw error;
    }
  };

  if (!activeConversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="mb-4 text-6xl opacity-50">💬</div>
          <h2 className="text-2xl font-semibold mb-2 text-gray-300">
            Select a conversation
          </h2>
          <p className="text-gray-500">
            Choose a contact or group to start messaging
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Chat Header */}
      <ChatHeader conversation={activeConversation} />

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <MessageList
          messages={conversationMessages}
          currentUser={user}
          conversation={activeConversation}
          messagesEndRef={messagesEndRef}
        />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-700">
        <MessageInput
          onSendMessage={handleSendMessage}
          conversation={activeConversation}
          isBlocked={checkIfBlocked()}
        />
      </div>
    </div>
  );
}
