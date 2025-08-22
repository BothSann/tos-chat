import axios from "axios";

class ApiService {
  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    this.axiosInstance.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error) => {
        // If we get 401 on any request except auth endpoints, try to refresh auth first
        const isAuthEndpoint = error.config?.url?.includes("/auth/");
        const isRetry = error.config?._retry; // Check if this is already a retry

        if (error.response?.status === 401 && !isAuthEndpoint && !isRetry) {
          // Mark this request as a retry to prevent infinite loops
          error.config._retry = true;

          // Try to refresh authentication by calling /auth/me
          try {
            const authResponse = await this.axiosInstance.get("/api/auth/me");
            if (authResponse.data.success) {
              // Auth refreshed successfully, retry the original request
              return this.axiosInstance.request(error.config);
            }
          } catch (refreshError) {
            // Refresh failed, clear auth state and redirect
            console.log("Auth refresh failed:", refreshError);
          }

          // Clear any stored auth state and redirect
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
        }

        // Handle banned user (403 with banned flag) - but not during login
        if (
          error.response?.status === 403 &&
          (error.response?.data?.banned || error.response?.data?.isBanned) &&
          !error.config?.url?.includes("/auth/login")
        ) {
          const { useAuthStore } = require("@/store/useStore");
          const { forceLogout } = useAuthStore.getState();
          const banReason =
            error.response?.data?.banReason || "Your account has been banned";
          forceLogout(`Your account has been banned. Reason: ${banReason}`);
        }

        return Promise.reject(error);
      }
    );
  }

  async login(credentials) {
    const response = await this.axiosInstance.post(
      "/api/auth/login",
      credentials
    );
    return response.data;
  }

  async register(data) {
    const response = await this.axiosInstance.post("/api/auth/register", data);
    return response.data;
  }

  async logout() {
    const response = await this.axiosInstance.post("/api/auth/logout");
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.axiosInstance.get("/api/auth/me");
    return response.data;
  }

  async updateProfile(data) {
    // Check if data is FormData (for file uploads) or regular object
    const isFormData = data instanceof FormData;

    const config = {
      headers: isFormData
        ? {
            "Content-Type": "multipart/form-data",
          }
        : {
            "Content-Type": "application/json",
          },
    };

    const response = await this.axiosInstance.put(
      "/api/users/profile",
      data,
      config
    );
    return response.data;
  }

  async updateStatus(status) {
    const response = await this.axiosInstance.put("/api/users/status", {
      status,
    });
    return response.data;
  }

  async searchUsers(query) {
    const response = await this.axiosInstance.get(
      `/api/users/search?query=${encodeURIComponent(query)}`
    );
    return response.data;
  }

  async getOnlineUsers() {
    const response = await this.axiosInstance.get("/api/users/online");
    return response.data;
  }

  async getContacts() {
    const response = await this.axiosInstance.get("/api/contacts");
    return response.data;
  }

  async addContact(username, nickname = "") {
    const response = await this.axiosInstance.post("/api/contacts", {
      username,
      nickname,
    });
    return response.data;
  }

  async removeContact(contactId) {
    const response = await this.axiosInstance.delete(
      `/api/contacts/${contactId}`
    );
    return response.data;
  }

  async getBlockedUsers() {
    const response = await this.axiosInstance.get("/api/contacts/blocked");
    return response.data;
  }

  async blockUser(username, reason = "") {
    const response = await this.axiosInstance.post("/api/contacts/block", {
      username,
      reason,
    });
    return response.data;
  }

  async unblockUser(userId) {
    const response = await this.axiosInstance.delete(
      `/api/contacts/unblock/${userId}`
    );
    return response.data;
  }

  async getPrivateMessages(userId, page = 0, size = 20) {
    const response = await this.axiosInstance.get(
      `/api/messages/private/${userId}?page=${page}&size=${size}`
    );
    return response.data;
  }

  async sendPrivateMessage(data) {
    // Check if we have recipientUsername (normal chat) or recipientId (bulk messaging)
    if (data.recipientUsername && !data.recipientId) {
      // Use the original endpoint for username-based messages
      const response = await this.axiosInstance.post(
        "/api/messages/private",
        data
      );
      return response.data;
    } else {
      // Use the new endpoint for ID-based messages (bulk messaging)
      const response = await this.axiosInstance.post(
        "/api/messages/send-private",
        data
      );
      return response.data;
    }
  }

  async sendPrivateFileMessage(formData) {
    const response = await this.axiosInstance.post(
      "/api/messages/private/file",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  }

  async deleteMessage(messageId) {
    const response = await this.axiosInstance.delete(
      `/api/messages/${messageId}`
    );
    return response.data;
  }

  async getGroups() {
    const response = await this.axiosInstance.get("/api/groups");
    return response.data;
  }

  async createGroup(data) {
    const response = await this.axiosInstance.post("/api/groups", data);
    return response.data;
  }

  async getGroupDetails(groupId) {
    const response = await this.axiosInstance.get(`/api/groups/${groupId}`);
    return response.data;
  }

  async addGroupMember(groupId, username) {
    const response = await this.axiosInstance.post(
      `/api/groups/${groupId}/members`,
      { username }
    );
    return response.data;
  }

  async removeGroupMember(groupId, userId) {
    const response = await this.axiosInstance.delete(
      `/api/groups/${groupId}/members/${userId}`
    );
    return response.data;
  }

  async getGroupMessages(groupId, page = 0, size = 20) {
    const response = await this.axiosInstance.get(
      `/api/groups/${groupId}/messages?page=${page}&size=${size}`
    );
    return response.data;
  }

  async sendGroupMessage(groupId, data) {
    const response = await this.axiosInstance.post(
      `/api/groups/${groupId}/messages`,
      data
    );
    return response.data;
  }

  async sendGroupFileMessage(groupId, formData) {
    const response = await this.axiosInstance.post(
      `/api/groups/${groupId}/messages/file`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  }

  async getAllUsers(page = 0, size = 20) {
    const response = await this.axiosInstance.get(
      `/api/admin/users?page=${page}&size=${size}`
    );
    return response.data;
  }

  async banUser(userId, reason) {
    const response = await this.axiosInstance.put(
      `/api/admin/users/${userId}/ban`,
      { reason }
    );
    return response.data;
  }

  async unbanUser(userId) {
    const response = await this.axiosInstance.put(
      `/api/admin/users/${userId}/unban`
    );
    return response.data;
  }

  async broadcastMessage(content) {
    const response = await this.axiosInstance.post("/api/admin/broadcast", {
      content,
      type: "SYSTEM",
    });
    return response.data;
  }

  async getSystemStats() {
    const response = await this.axiosInstance.get("/api/admin/stats");
    return response.data;
  }

  async getBannedUsers(page = 0, size = 20) {
    const response = await this.axiosInstance.get(
      `/api/admin/banned-users?page=${page}&size=${size}`
    );
    return response.data;
  }

  // Chat deletion - only affects current user
  async deleteChat(conversationId, conversationType) {
    const response = await this.axiosInstance.delete(`/api/chat/delete`, {
      data: {
        conversationId: conversationId.toString(), // Ensure string format
        conversationType, // 'private' or 'group'
      },
    });
    return response.data;
  }

  // Check if current user is blocked by another user
  async checkIfBlocked(userId) {
    const response = await this.axiosInstance.get(
      `/api/users/${userId}/blocked-status`
    );
    return response.data;
  }

  // Get blocked users
  async getBlockedUsers() {
    const response = await this.axiosInstance.get("/api/contacts/blocked");
    return response.data;
  }
}

export const apiService = new ApiService();
