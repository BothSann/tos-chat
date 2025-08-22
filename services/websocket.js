import SockJS from "sockjs-client";
import { Stomp } from "@stomp/stompjs";

class WebSocketService {
  constructor() {
    this.stompClient = null;
    this.isConnected = false;
    this.subscriptions = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  connect(onConnect, onError) {
    // Disconnect any existing connection first
    if (this.stompClient) {
      this.disconnect();
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8080/ws";
    this.stompClient = Stomp.over(() => new SockJS(wsUrl));

    // Disable debug for production
    this.stompClient.debug = () => {};

    this.stompClient.connect(
      {},
      (frame) => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        if (onConnect) onConnect();
      },
      (error) => {
        this.isConnected = false;
        if (onError) onError(error);
        this.attemptReconnect(onConnect, onError);
      }
    );

    this.stompClient.onWebSocketClose = () => {
      this.isConnected = false;
      // Removed auto-reconnect to prevent loops
    };
  }

  attemptReconnect(onConnect, onError) {
    // Disable automatic reconnection to prevent loops
    this.isConnected = false;
  }

  disconnect() {
    if (this.stompClient && this.isConnected) {
      this.subscriptions.clear();
      this.stompClient.disconnect();
      this.isConnected = false;
      this.reconnectAttempts = 0;
    }
  }

  subscribe(destination, callback) {
    if (!this.stompClient) {
      return null;
    }

    if (!this.isConnected) {
      return null;
    }

    try {
      const subscription = this.stompClient.subscribe(
        destination,
        (message) => {
          try {
            const messageData = JSON.parse(message.body);
            callback(messageData);
          } catch (error) {
            // Silently ignore parse errors
          }
        }
      );

      this.subscriptions.set(destination, subscription);
      return subscription;
    } catch (error) {
      return null;
    }
  }

  unsubscribe(destination) {
    const subscription = this.subscriptions.get(destination);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(destination);
    }
  }

  subscribeToPrivateMessages(callback) {
    return this.subscribe("/user/queue/messages", callback);
  }

  subscribeToGroupMessages(groupId, callback) {
    return this.subscribe(`/topic/group/${groupId}`, callback);
  }

  subscribeToStatusUpdates(callback) {
    return this.subscribe("/topic/status", callback);
  }

  subscribeToSystemMessages(callback) {
    return this.subscribe("/topic/system", callback);
  }

  subscribeToBroadcasts(callback) {
    return this.subscribe("/topic/broadcast", callback);
  }

  subscribeToGroupNotifications(callback) {
    return this.subscribe("/user/queue/notifications", callback);
  }

  subscribeToTypingIndicators(conversationId, callback) {
    return this.subscribe(`/topic/typing/${conversationId}`, callback);
  }

  send(destination, data) {
    if (this.stompClient && this.isConnected) {
      try {
        this.stompClient.send(destination, {}, JSON.stringify(data));
        return true;
      } catch (error) {
        return false;
      }
    }
    return false;
  }

  sendPrivateMessage(data) {
    return this.send("/app/chat.sendMessage", data);
  }

  sendGroupMessage(groupId, data) {
    return this.send(`/app/chat.sendGroupMessage/${groupId}`, data);
  }

  updateStatus(status) {
    return this.send("/app/chat.updateStatus", { status });
  }

  sendTypingIndicator(recipientUsername, isTyping) {
    return this.send("/app/chat.typing", {
      recipientUsername,
      isTyping,
    });
  }

  sendGroupTypingIndicator(groupId, isTyping) {
    return this.send("/app/chat.groupTyping", {
      groupId,
      isTyping,
    });
  }

  isConnectedToWebSocket() {
    return this.isConnected;
  }

  getConnectionState() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      subscriptions: Array.from(this.subscriptions.keys()),
    };
  }
}

export const webSocketService = new WebSocketService();
