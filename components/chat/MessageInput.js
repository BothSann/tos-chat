"use client";

import { useState, useRef } from "react";
import { Send, Paperclip, Smile, Image, UserX } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useUIStore } from "@/store/useStore";

export default function MessageInput({ onSendMessage, conversation, isBlocked = false }) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const { sendTypingIndicator, sendGroupTypingIndicator } = useWebSocket();
  const { addNotification } = useUIStore();

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);

      if (conversation.type === "group") {
        sendGroupTypingIndicator(conversation.group.id, true);
      } else {
        sendTypingIndicator(conversation.user.username, true);
      }
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);

      if (conversation.type === "group") {
        sendGroupTypingIndicator(conversation.group.id, false);
      } else {
        sendTypingIndicator(conversation.user.username, false);
      }
    }, 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!message.trim() || isSending) return;

    const messageContent = message.trim();
    setMessage("");
    setIsSending(true);

    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (conversation.type === "group") {
        sendGroupTypingIndicator(conversation.group.id, false);
      } else {
        sendTypingIndicator(conversation.user.username, false);
      }
    }

    try {
      await onSendMessage({
        content: messageContent,
        type: "TEXT",
      });
    } catch (error) {
      addNotification({
        type: "error",
        title: "Failed to send message",
        message: error.message || "Please try again",
        duration: 3000,
      });
      setMessage(messageContent); // Restore message
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    handleTyping();
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      addNotification({
        type: "error",
        title: "File too large",
        message: "Please select a file smaller than 10MB",
        duration: 5000,
      });
      return;
    }

    // Check file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/bmp",
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/zip",
      "application/x-rar-compressed",
      "application/x-zip-compressed",
    ];

    if (!allowedTypes.includes(file.type)) {
      addNotification({
        type: "error",
        title: "Unsupported file type",
        message: "Please select an image, PDF, or document file",
        duration: 5000,
      });
      return;
    }

    setIsSending(true);

    try {
      // Determine message type based on file type
      const messageType = file.type.startsWith("image/") ? "IMAGE" : "FILE";

      await onSendMessage({
        type: messageType,
        file: file,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });

      // Clear the file input
      e.target.value = "";

      // Show success notification
      addNotification({
        type: "success",
        title: "File sent successfully",
        message: `${file.name} has been shared`,
        duration: 3000,
      });
    } catch (error) {
      addNotification({
        type: "error",
        title: "Failed to send file",
        message: error.message || "Please try again",
        duration: 5000,
      });
    } finally {
      setIsSending(false);
    }
  };

  // Show blocked message if user is blocked
  if (isBlocked) {
    return (
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center justify-center gap-3 p-4 bg-red-600/10 border border-red-600/20 rounded-lg">
          <UserX size={24} className="text-red-400" />
          <div className="text-center">
            <div className="text-red-400 font-medium">You are blocked</div>
            <div className="text-sm text-gray-400">
              You cannot send messages to this user
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        {/* File input (hidden) */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar,.xls,.xlsx,.ppt,.pptx"
        />

        {/* Attachment button */}
        <button
          type="button"
          onClick={handleFileUpload}
          className="flex-shrink-0 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          title="Attach file"
        >
          <Paperclip size={20} />
        </button>

        {/* Message input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={`Message ${conversation.name}...`}
            className="w-full px-4 py-3 pr-12 bg-gray-700 border border-gray-600 rounded-lg resize-none focus:outline-none focus:border-amber-500 text-white placeholder-gray-400"
            rows={1}
            style={{
              minHeight: "44px",
              maxHeight: "120px",
            }}
          />

          {/* Emoji button */}
          <button
            type="button"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            title="Add emoji"
            onClick={() => {
              addNotification({
                type: "info",
                title: "Emoji picker",
                message: "Emoji picker will be implemented soon",
                duration: 3000,
              });
            }}
          >
            <Smile size={20} />
          </button>
        </div>

        {/* Send button */}
        <button
          type="submit"
          disabled={!message.trim() || isSending}
          className="flex-shrink-0 p-2 bg-amber-500 text-black rounded-lg hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Send message"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
