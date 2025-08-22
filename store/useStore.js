import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiService } from "@/services/api";
import { webSocketService } from "@/services/websocket";
import { formatAvatarUrls, formatUserAvatarUrl } from "@/lib/utils";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (credentials) => {
        set({ isLoading: true });
        try {
          const response = await apiService.login(credentials);
          if (response.success) {
            // Handle avatarUrl formatting for login
            const userData = formatUserAvatarUrl(response.data);

            // Check if user is banned before setting auth state
            if (userData.isBanned || userData.banned) {
              set({ isLoading: false });
              const banReason =
                userData.banReason || "Your account has been banned";
              throw new Error(`BANNED: ${banReason}`);
            }

            set({
              user: userData,
              isAuthenticated: true,
              isLoading: false,
            });

            // Check state after setting
            const newState = get();

            return { success: true, user: userData };
          }
          throw new Error(response.message || "Login failed");
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (userData) => {
        set({ isLoading: true });
        try {
          const response = await apiService.register(userData);
          if (response.success) {
            set({
              user: response.data,
              isAuthenticated: true,
              isLoading: false,
            });
            return { success: true, user: response.data };
          }
          throw new Error(response.message || "Registration failed");
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await apiService.logout();
          webSocketService.disconnect();

          // Clear all store data
          const { clearAllData: clearChatData } = useChatStore.getState();
          const { clearAllData: clearContactData } = useContactStore.getState();
          const { clearAllData: clearGroupData } = useGroupStore.getState();

          clearChatData();
          clearContactData();
          clearGroupData();

          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        } catch (error) {
          // Even if logout API fails, still clear all data
          const { clearAllData: clearChatData } = useChatStore.getState();
          const { clearAllData: clearContactData } = useContactStore.getState();
          const { clearAllData: clearGroupData } = useGroupStore.getState();

          clearChatData();
          clearContactData();
          clearGroupData();

          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      // Force logout for banned users
      forceLogout: (reason = "Account access revoked") => {
        webSocketService.disconnect();

        // Clear all store data
        const { clearAllData: clearChatData } = useChatStore.getState();
        const { clearAllData: clearContactData } = useContactStore.getState();
        const { clearAllData: clearGroupData } = useGroupStore.getState();

        clearChatData();
        clearContactData();
        clearGroupData();

        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });

        // Show notification
        const { addNotification } = useUIStore.getState();
        addNotification({
          type: "error",
          title: "Account Banned",
          message: reason,
          duration: 10000,
        });

        // Redirect to login
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const response = await apiService.getCurrentUser();
          if (response.success) {
            // Handle avatarUrl formatting for existing users
            const userData = formatUserAvatarUrl(response.data);

            set({
              user: userData,
              isAuthenticated: true,
              isLoading: false,
            });
            // Check state after setting
            const newState = get();
            return true;
          }
          // If response is not successful, treat as not authenticated
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return false;
        } catch (error) {
          // Reset auth state on any error
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return false;
        }
      },

      updateProfile: async (profileData) => {
        try {
          const response = await apiService.updateProfile(profileData);

          if (response.success) {
            // Update user data in store with new profile information
            // Handle avatarUrl formatting - ensure it has the correct base URL
            const updatedUserData = formatUserAvatarUrl(response.data);

            set((state) => ({
              user: { ...state.user, ...updatedUserData },
            }));

            return { success: true, data: updatedUserData };
          }
          throw new Error(response.message || "Profile update failed");
        } catch (error) {
          throw error;
        }
      },

      updateStatus: async (status) => {
        try {
          const response = await apiService.updateStatus(status);
          if (response.success) {
            set((state) => ({
              user: { ...state.user, status },
            }));
            webSocketService.updateStatus(status);
          }
        } catch (error) {}
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            // Auth store hydration failed
          } else {
            // Auth store hydrated
          }
        };
      },
    }
  )
);

export const useChatStore = create((set, get) => ({
  activeConversation: null,
  messages: {},
  typingUsers: {},
  unreadCounts: {},

  setActiveConversation: (conversation) => {
    set({ activeConversation: conversation });
  },

  addMessage: (message) => {
    set((state) => {
      // Get the current user from auth store
      const currentUser = useAuthStore.getState().user;

      // Format avatar URL for the message sender
      const messageWithFormattedAvatar = formatUserAvatarUrl(message);

      // For group messages: group-{groupId}
      // For private messages: user-{otherUserId} (always the other person's ID)
      let conversationId;

      if (messageWithFormattedAvatar.groupId) {
        conversationId = `group-${messageWithFormattedAvatar.groupId}`;
      } else {
        // For private messages, always use the other person's ID as the conversation identifier
        if (messageWithFormattedAvatar.senderId === currentUser?.id) {
          // I sent this message, use recipient's ID
          conversationId = `user-${messageWithFormattedAvatar.recipientId}`;
        } else {
          // Someone sent me this message, use sender's ID
          conversationId = `user-${messageWithFormattedAvatar.senderId}`;
        }
      }

      const existingMessages = state.messages[conversationId] || [];

      // Prevent duplicate messages
      if (
        existingMessages.find((m) => m.id === messageWithFormattedAvatar.id)
      ) {
        return state;
      }

      const convertTimestamp = (timestamp) => {
        if (Array.isArray(timestamp) && timestamp.length >= 6) {
          const [year, month, day, hour, minute, second, nanosecond] =
            timestamp;
          return new Date(
            year,
            month - 1,
            day,
            hour,
            minute,
            second,
            Math.floor((nanosecond || 0) / 1000000)
          );
        }
        return new Date(timestamp);
      };

      const newMessages = [
        ...existingMessages,
        messageWithFormattedAvatar,
      ].sort((a, b) => {
        const dateA = convertTimestamp(a.timestamp);
        const dateB = convertTimestamp(b.timestamp);

        return dateA.getTime() - dateB.getTime();
      });

      const newState = {
        messages: {
          ...state.messages,
          [conversationId]: newMessages,
        },
      };

      return newState;
    });
  },

  loadMessages: (conversationId, messages) => {
    set((state) => {
      // Format avatar URLs for all loaded messages
      const messagesWithFormattedAvatars = formatAvatarUrls(messages);

      const convertTimestamp = (timestamp) => {
        if (Array.isArray(timestamp) && timestamp.length >= 6) {
          const [year, month, day, hour, minute, second, nanosecond] =
            timestamp;
          return new Date(
            year,
            month - 1,
            day,
            hour,
            minute,
            second,
            Math.floor((nanosecond || 0) / 1000000)
          );
        }
        return new Date(timestamp);
      };

      const sortedMessages = messagesWithFormattedAvatars.sort((a, b) => {
        const dateA = convertTimestamp(a.timestamp);
        const dateB = convertTimestamp(b.timestamp);

        return dateA.getTime() - dateB.getTime();
      });

      const newState = {
        messages: {
          ...state.messages,
          [conversationId]: sortedMessages,
        },
      };
      return newState;
    });
  },

  updateTypingUsers: (conversationId, typingUsers) => {
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [conversationId]: typingUsers,
      },
    }));
  },

  incrementUnreadCount: (conversationId) => {
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [conversationId]: (state.unreadCounts[conversationId] || 0) + 1,
      },
    }));
  },

  clearUnreadCount: (conversationId) => {
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [conversationId]: 0,
      },
    }));
  },

  removeMessage: (messageId) => {
    set((state) => {
      const newMessages = {};
      Object.keys(state.messages).forEach((conversationId) => {
        newMessages[conversationId] = state.messages[conversationId].filter(
          (message) => message.id !== messageId
        );
      });
      return { messages: newMessages };
    });
  },

  clearContactMessages: (contactId) => {
    set((state) => {
      const conversationId = `user-${contactId}`;
      const newMessages = { ...state.messages };
      const newUnreadCounts = { ...state.unreadCounts };

      // Remove all messages for this contact
      delete newMessages[conversationId];
      // Clear unread count for this contact
      delete newUnreadCounts[conversationId];

      return {
        messages: newMessages,
        unreadCounts: newUnreadCounts,
      };
    });
  },

  clearActiveConversationIfContact: (contactId) => {
    set((state) => {
      const conversationId = `user-${contactId}`;
      if (
        state.activeConversation?.id === conversationId ||
        state.activeConversation?.user?.id === contactId
      ) {
        return { activeConversation: null };
      }
      return state;
    });
  },

  deleteChat: async (conversation) => {
    try {
      const conversationId =
        conversation.type === "group"
          ? conversation.group.id
          : conversation.user.id;

      // Map frontend conversation type to backend expected format
      const conversationType =
        conversation.type === "group" ? "group" : "private";

      // Call backend API to delete chat for current user only
      const response = await apiService.deleteChat(
        conversationId,
        conversationType
      );

      if (response.success) {
        const fullConversationId =
          conversation.type === "group"
            ? `group-${conversation.group.id}`
            : `user-${conversation.user.id}`;

        set((state) => {
          const newMessages = { ...state.messages };
          const newUnreadCounts = { ...state.unreadCounts };

          // Remove all messages for this conversation
          delete newMessages[fullConversationId];
          // Clear unread count for this conversation
          delete newUnreadCounts[fullConversationId];

          // Clear active conversation if it's the deleted one
          const newActiveConversation =
            state.activeConversation?.id === fullConversationId
              ? null
              : state.activeConversation;

          return {
            messages: newMessages,
            unreadCounts: newUnreadCounts,
            activeConversation: newActiveConversation,
          };
        });

        return { success: true };
      }

      throw new Error(response.message || "Failed to delete chat");
    } catch (error) {
      throw error;
    }
  },

  clearAllData: () => {
    set({
      messages: {},
      activeConversation: null,
      unreadCounts: {},
      typingUsers: {},
    });
  },
}));

export const useContactStore = create((set, get) => ({
  contacts: [],
  blockedUsers: [],
  onlineUsers: [],
  isLoading: false,

  loadContacts: async () => {
    set({ isLoading: true });
    try {
      const response = await apiService.getContacts();

      if (response.success) {
        // Format avatar URLs for all contacts
        const contactsWithFormattedAvatars = formatAvatarUrls(response.data);
        set({ contacts: contactsWithFormattedAvatars, isLoading: false });
      } else {
        throw new Error(response.message || "Failed to load contacts");
      }
    } catch (error) {
      if (error.response?.status === 401) {
        // Session expired, clear contacts and don't retry
        set({ contacts: [], isLoading: false });
        return false;
      }
      set({ contacts: [], isLoading: false });
      return false;
    }
    return true;
  },

  addContact: async (username, nickname) => {
    try {
      const response = await apiService.addContact(username, nickname);

      // Handle different possible response structures
      if (response.success && response.data) {
        // Standard success response with data

        // Validate contact data before adding to state - temporarily relaxed for debugging
        if (!response.data.id && !response.data.userId) {
          throw new Error("Contact data missing ID field");
        }

        // Normalize the data structure if needed
        const normalizedContact = {
          ...response.data,
          id: response.data.id || response.data.userId, // Handle both id and userId
          username: response.data.username || response.data.userName, // Handle both username and userName
        };

        // Format avatar URL for the new contact
        const contactWithFormattedAvatar =
          formatUserAvatarUrl(normalizedContact);

        set((state) => {
          const newState = {
            contacts: [...state.contacts, contactWithFormattedAvatar],
          };
          return newState;
        });
        return { success: true, data: contactWithFormattedAvatar };
      } else if (response.message === "Contact added successfully") {
        // Backend returned success message but different structure

        // Since we don't have the contact data, reload the contacts list
        await get().loadContacts();
        return { success: true, message: response.message };
      } else if (
        response.message &&
        response.message.includes("successfully")
      ) {
        // Handle other success messages
        await get().loadContacts();
        return { success: true, message: response.message };
      }

      throw new Error(response.message || "Failed to add contact");
    } catch (error) {
      throw error;
    }
  },

  removeContact: async (contactId) => {
    try {
      const response = await apiService.removeContact(contactId);
      if (response.success) {
        // Remove contact from contacts list
        set((state) => ({
          contacts: state.contacts.filter(
            (contact) => contact.id !== contactId
          ),
        }));

        // Clear all messages and conversation data for this contact
        const { clearContactMessages, clearActiveConversationIfContact } =
          useChatStore.getState();
        clearContactMessages(contactId);
        clearActiveConversationIfContact(contactId);

        return { success: true };
      }
      throw new Error(response.message || "Failed to remove contact");
    } catch (error) {
      throw error;
    }
  },

  loadBlockedUsers: async () => {
    try {
      const response = await apiService.getBlockedUsers();
      if (response.success) {
        const blockedUsersWithFormattedAvatars = formatAvatarUrls(
          response.data
        );
        set({ blockedUsers: blockedUsersWithFormattedAvatars });
      }
    } catch (error) {}
  },

  blockUser: async (username, reason) => {
    try {
      const response = await apiService.blockUser(username, reason);
      if (response.success) {
        await get().loadBlockedUsers();
        return { success: true };
      }
      throw new Error(response.message || "Failed to block user");
    } catch (error) {
      throw error;
    }
  },

  unblockUser: async (userId) => {
    try {
      const response = await apiService.unblockUser(userId);
      if (response.success) {
        set((state) => ({
          blockedUsers: state.blockedUsers.filter((user) => user.id !== userId),
        }));
        return { success: true };
      }
      throw new Error(response.message || "Failed to unblock user");
    } catch (error) {
      throw error;
    }
  },

  loadOnlineUsers: async () => {
    try {
      const response = await apiService.getOnlineUsers();
      if (response.success) {
        const onlineUsersWithFormattedAvatars = formatAvatarUrls(response.data);
        set({ onlineUsers: onlineUsersWithFormattedAvatars });
      }
    } catch (error) {}
  },

  updateUserStatus: (userId, status) => {
    set((state) => ({
      contacts: state.contacts.map((contact) =>
        contact.id === userId ? { ...contact, status } : contact
      ),
      onlineUsers: state.onlineUsers.map((user) =>
        user.id === userId ? { ...user, status } : user
      ),
    }));
  },

  clearAllData: () => {
    set({
      contacts: [],
      blockedUsers: [],
      onlineUsers: [],
      isLoading: false,
    });
  },
}));

export const useGroupStore = create((set, get) => ({
  groups: [],
  activeGroup: null,
  groupMembers: {},
  isLoading: false,

  loadGroups: async () => {
    set({ isLoading: true });
    try {
      const response = await apiService.getGroups();
      if (response.success) {
        // Format avatar URLs for groups (if groups have avatars)
        const groupsWithFormattedAvatars = formatAvatarUrls(response.data);
        set({ groups: groupsWithFormattedAvatars, isLoading: false });
      } else {
        throw new Error(response.message || "Failed to load groups");
      }
    } catch (error) {
      if (error.response?.status === 401) {
        // Session expired, clear groups and don't retry
        set({ groups: [], isLoading: false });
        return false;
      }
      set({ groups: [], isLoading: false });
      return false;
    }
    return true;
  },

  createGroup: async (groupData) => {
    try {
      const response = await apiService.createGroup(groupData);
      if (response.success) {
        // Instead of just adding the response data, reload all groups to get complete info
        await get().loadGroups();
        return { success: true, group: response.data };
      }
      throw new Error(response.message || "Failed to create group");
    } catch (error) {
      throw error;
    }
  },

  setActiveGroup: (group) => {
    set({ activeGroup: group });
  },

  loadGroupDetails: async (groupId) => {
    try {
      const response = await apiService.getGroupDetails(groupId);
      if (response.success) {
        // Format avatar URLs for group members
        const membersWithFormattedAvatars = formatAvatarUrls(
          response.data.members
        );
        set((state) => ({
          groupMembers: {
            ...state.groupMembers,
            [groupId]: membersWithFormattedAvatars,
          },
        }));
        return { ...response.data, members: membersWithFormattedAvatars };
      }
    } catch (error) {
      throw error;
    }
  },

  addGroupMember: async (groupId, username) => {
    try {
      const response = await apiService.addGroupMember(groupId, username);
      if (response.success) {
        await get().loadGroupDetails(groupId);
        return { success: true };
      }
      throw new Error(response.message || "Failed to add member");
    } catch (error) {
      throw error;
    }
  },

  removeGroupMember: async (groupId, userId) => {
    try {
      const response = await apiService.removeGroupMember(groupId, userId);
      if (response.success) {
        set((state) => ({
          groupMembers: {
            ...state.groupMembers,
            [groupId]: (state.groupMembers[groupId] || []).filter(
              (member) => member.userId !== userId
            ),
          },
        }));
        return { success: true };
      }
      throw new Error(response.message || "Failed to remove member");
    } catch (error) {
      throw error;
    }
  },

  clearAllData: () => {
    set({
      groups: [],
      activeGroup: null,
      groupMembers: {},
      isLoading: false,
    });
  },
}));

export const useAdminStore = create((set, get) => ({
  users: [],
  bannedUsers: [],
  systemStats: null,
  isLoading: false,
  totalPages: 0,
  currentPage: 0,
  bannedTotalPages: 0,
  bannedCurrentPage: 0,

  loadUsers: async (page = 0, size = 20) => {
    set({ isLoading: true });
    try {
      const response = await apiService.getAllUsers(page, size);
      if (response.success) {
        set({
          users: response.data.users,
          totalPages: response.data.totalPages,
          currentPage: response.data.currentPage,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error("Failed to load users:", error);
      set({ isLoading: false });
    }
  },

  banUser: async (userId, reason) => {
    try {
      const response = await apiService.banUser(userId, reason);
      if (response.success) {
        set((state) => ({
          users: state.users.map((user) =>
            user.id === userId ? { ...user, isBanned: true } : user
          ),
        }));
        return { success: true };
      }
      throw new Error(response.message || "Failed to ban user");
    } catch (error) {
      throw error;
    }
  },

  unbanUser: async (userId) => {
    try {
      const response = await apiService.unbanUser(userId);
      if (response.success) {
        set((state) => ({
          users: state.users.map((user) =>
            user.id === userId ? { ...user, isBanned: false } : user
          ),
        }));
        return { success: true };
      }
      throw new Error(response.message || "Failed to unban user");
    } catch (error) {
      throw error;
    }
  },

  broadcastMessage: async (content) => {
    try {
      const response = await apiService.broadcastMessage(content);
      if (response.success) {
        return { success: true };
      }
      throw new Error(response.message || "Failed to broadcast message");
    } catch (error) {
      throw error;
    }
  },

  loadSystemStats: async () => {
    try {
      const response = await apiService.getSystemStats();
      if (response.success) {
        set({ systemStats: response.data });
      }
    } catch (error) {
      console.error("Failed to load system stats:", error);
    }
  },

  loadBannedUsers: async (page = 0, size = 20) => {
    set({ isLoading: true });
    try {
      const response = await apiService.getBannedUsers(page, size);
      if (response.success) {
        set({
          bannedUsers: response.data.users,
          bannedTotalPages: response.data.totalPages,
          bannedCurrentPage: response.data.currentPage,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error("Failed to load banned users:", error);
      set({ isLoading: false });
    }
  },
}));

export const useUIStore = create((set) => ({
  theme: "dark",
  sidebarOpen: true,
  notifications: [],
  activeModal: null,

  toggleTheme: () => {
    set((state) => ({
      theme: state.theme === "light" ? "dark" : "light",
    }));
  },

  toggleSidebar: () => {
    set((state) => ({
      sidebarOpen: !state.sidebarOpen,
    }));
  },

  addNotification: (notification) => {
    const id = Date.now().toString();

    set((state) => {
      // Prevent duplicate notifications with same title and message
      const isDuplicate = state.notifications.some(
        (n) =>
          n.title === notification.title &&
          n.message === notification.message &&
          n.type === notification.type
      );

      if (isDuplicate) {
        return state;
      }

      return {
        notifications: [...state.notifications, { ...notification, id }],
      };
    });

    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    }, notification.duration || 5000);
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  setActiveModal: (modal) => {
    set({ activeModal: modal });
  },
}));
