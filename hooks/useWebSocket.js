import { useEffect, useCallback } from "react";
import { webSocketService } from "@/services/websocket";
import {
  useAuthStore,
  useChatStore,
  useContactStore,
  useGroupStore,
  useUIStore,
} from "@/store/useStore";

export function useWebSocket() {
  const { isAuthenticated, user } = useAuthStore();
  const { addMessage, updateTypingUsers } = useChatStore();
  const { updateUserStatus } = useContactStore();
  const { loadGroups } = useGroupStore();
  const { addNotification } = useUIStore();

  const handlePrivateMessage = useCallback(
    (message) => {
      // Ensure the message has recipientId for proper conversation categorization
      if (!message.recipientId && message.senderId !== user?.id) {
        // This message was sent to me, so I'm the recipient
        message.recipientId = user?.id;
      }

      // Ensure we have all required fields for proper message handling
      const processedMessage = {
        ...message,
        timestamp: message.timestamp || new Date().toISOString(),
        senderFullName:
          message.senderFullName || message.senderUsername || "New Message",
      };

      addMessage(processedMessage);

      // Only show notification if the message is from someone else
      if (message.senderId !== user?.id) {
        addNotification({
          type: "message",
          title: `${processedMessage.senderFullName}`,
          message: message.content || "New message",
          duration: 3000,
        });
      }
    },
    [addMessage, addNotification, user]
  );

  const handleGroupMessage = useCallback(
    (message) => {
      // Ensure we have all required fields for proper message handling
      const processedMessage = {
        ...message,
        senderFullName: message.senderFullName || message.senderUsername || "New Message",
      };
      
      addMessage(processedMessage);
      if (message.senderId !== user?.id) {
        addNotification({
          type: "message",
          title: `${processedMessage.senderFullName} in ${message.groupName || "Group"}`,
          message: message.content || "New message",
          duration: 3000,
        });
      }
    },
    [addMessage, addNotification, user]
  );

  const handleStatusUpdate = useCallback(
    (statusUpdate) => {
      updateUserStatus(statusUpdate.userId, statusUpdate.status);
    },
    [updateUserStatus]
  );

  const handleSystemMessage = useCallback(
    (systemMessage) => {
      addNotification({
        type: "system",
        title: "System Message",
        message: systemMessage.content,
        duration: 5000,
      });
    },
    [addNotification]
  );

  const handleBroadcast = useCallback(
    (broadcast) => {
      // Check if it's a ban notification
      if (broadcast.type === "USER_BANNED" && broadcast.userId === user?.id) {
        const { forceLogout } = useAuthStore.getState();
        const banReason = broadcast.reason || "Your account has been banned";
        forceLogout(`Your account has been banned. Reason: ${banReason}`);
        return;
      }

      addNotification({
        type: "broadcast",
        title: "Admin Broadcast",
        message: broadcast.content,
        duration: 10000,
      });
    },
    [addNotification, user]
  );

  const handleGroupNotification = useCallback(
    (notification) => {
      try {
        if (notification.type === "GROUP_MEMBERSHIP_ADDED") {
          // Show success notification
          addNotification({
            type: "success",
            title: "Added to Group",
            message: notification.message,
            duration: 5000,
          });

          // Add a small delay to ensure database transaction is committed before reloading
          setTimeout(() => {
            loadGroups();
          }, 500);
        } else if (notification.type === "GROUP_MEMBERSHIP_REMOVED") {
          // Show info notification
          addNotification({
            type: "info",
            title: "Removed from Group",
            message: notification.message,
            duration: 5000,
          });

          // Add a small delay to ensure database transaction is committed before reloading
          setTimeout(() => {
            loadGroups();
          }, 500);
        } else if (notification.type === "GROUP_UPDATED") {
          // Show info notification
          addNotification({
            type: "info",
            title: "Group Updated",
            message: notification.message,
            duration: 3000,
          });

          // Reload groups to get updated group info
          loadGroups();
        }
      } catch (error) {}
    },
    [addNotification, loadGroups]
  );

  const handleTypingIndicator = useCallback(
    (typingData) => {
      const conversationId = typingData.groupId
        ? `group-${typingData.groupId}`
        : `user-${typingData.senderId}`;

      updateTypingUsers(conversationId, typingData.typingUsers || []);
    },
    [updateTypingUsers]
  );

  const connect = useCallback(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    // Prevent multiple connections
    if (webSocketService.isConnectedToWebSocket()) {
      return;
    }

    const onConnect = () => {
      // Longer delay to ensure STOMP connection is fully established
      setTimeout(() => {
        try {
          const privateSubscription =
            webSocketService.subscribeToPrivateMessages(handlePrivateMessage);

          if (privateSubscription) {
            // Private messages subscription successful
          } else {
            // Private messages subscription failed
          }

          // Other subscriptions
          webSocketService.subscribeToStatusUpdates(handleStatusUpdate);
          webSocketService.subscribeToSystemMessages(handleSystemMessage);
          webSocketService.subscribeToBroadcasts(handleBroadcast);

          // Subscribe to group notifications
          webSocketService.subscribeToGroupNotifications(
            handleGroupNotification
          );
        } catch (error) {
          // Removed notification to prevent spam
        }
      }, 1000); // Longer delay to ensure STOMP is ready
    };

    const onError = (error) => {
      // Removed notification to prevent spam
    };

    webSocketService.connect(onConnect, onError);
  }, [
    isAuthenticated,
    user,
    handlePrivateMessage,
    handleStatusUpdate,
    handleSystemMessage,
    handleBroadcast,
    handleGroupNotification,
    addNotification,
  ]);

  const disconnect = useCallback(() => {
    webSocketService.disconnect();
  }, []);

  const subscribeToGroup = useCallback(
    (groupId) => {
      if (!webSocketService.isConnectedToWebSocket()) {
        return;
      }

      try {
        webSocketService.subscribeToGroupMessages(groupId, handleGroupMessage);
        webSocketService.subscribeToTypingIndicators(
          `group-${groupId}`,
          handleTypingIndicator
        );
      } catch (error) {}
    },
    [handleGroupMessage, handleTypingIndicator]
  );

  const unsubscribeFromGroup = useCallback((groupId) => {
    webSocketService.unsubscribe(`/topic/group/${groupId}`);
    webSocketService.unsubscribe(`/topic/typing/group-${groupId}`);
  }, []);

  const subscribeToPrivateChat = useCallback(
    (userId) => {
      if (!webSocketService.isConnectedToWebSocket()) {
        return;
      }

      try {
        webSocketService.subscribeToTypingIndicators(
          `user-${userId}`,
          handleTypingIndicator
        );
      } catch (error) {}
    },
    [handleTypingIndicator]
  );

  const sendMessage = useCallback((messageData) => {
    const result = webSocketService.sendPrivateMessage(messageData);
    return result;
  }, []);

  const sendGroupMessage = useCallback((groupId, messageData) => {
    return webSocketService.sendGroupMessage(groupId, messageData);
  }, []);

  const updateStatus = useCallback((status) => {
    return webSocketService.updateStatus(status);
  }, []);

  const sendTypingIndicator = useCallback((recipientUsername, isTyping) => {
    return webSocketService.sendTypingIndicator(recipientUsername, isTyping);
  }, []);

  const sendGroupTypingIndicator = useCallback((groupId, isTyping) => {
    return webSocketService.sendGroupTypingIndicator(groupId, isTyping);
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Prevent duplicate connections by checking if already connected
      if (!webSocketService.isConnectedToWebSocket()) {
        const connectTimer = setTimeout(() => {
          connect();
        }, 500); // Longer delay for stability

        return () => {
          clearTimeout(connectTimer);
        };
      } else {
        // Already connected, skipping connection attempt
      }
    } else {
      disconnect();
    }
  }, [isAuthenticated, user]);

  return {
    connect,
    disconnect,
    subscribeToGroup,
    unsubscribeFromGroup,
    subscribeToPrivateChat,
    sendMessage,
    sendGroupMessage,
    updateStatus,
    sendTypingIndicator,
    sendGroupTypingIndicator,
    isConnected: webSocketService.isConnectedToWebSocket(),
    connectionState: webSocketService.getConnectionState(),
    forceReconnect: () => {
      disconnect();
      setTimeout(() => connect(), 1000);
    },
  };
}
