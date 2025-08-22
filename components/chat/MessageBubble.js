"use client";

import { useState } from "react";
import { format } from "date-fns";
import { MoreVertical, Edit, Trash2, Copy, Download, Eye } from "lucide-react";

export default function MessageBubble({
  messages,
  senderName,
  senderUsername,
  senderAvatar,
  currentUserAvatar,
  isOwnMessage,
  showAvatar = false,
}) {
  const [showMenu, setShowMenu] = useState(null);

  const formatTime = (timestamp) => {
    if (!timestamp) {
      return "--:--";
    }

    try {
      let date;

      // Handle array format from Java LocalDateTime: [year, month, day, hour, minute, second, nanosecond]
      if (Array.isArray(timestamp) && timestamp.length >= 6) {
        const [year, month, day, hour, minute, second, nanosecond] = timestamp;
        // Note: JavaScript months are 0-indexed, but Java months are 1-indexed
        date = new Date(
          year,
          month - 1,
          day,
          hour,
          minute,
          second,
          Math.floor((nanosecond || 0) / 1000000)
        );
      } else {
        // Handle normal timestamp/date string
        date = new Date(timestamp);
      }

      if (isNaN(date.getTime())) {
        console.warn(
          "MessageBubble formatTime - Invalid date from timestamp:",
          timestamp
        );
        return "--:--";
      }

      return format(date, "HH:mm");
    } catch (error) {
      console.warn(
        "MessageBubble formatTime - Error formatting timestamp:",
        timestamp,
        error
      );
      return "--:--";
    }
  };

  const copyToClipboard = (content) => {
    navigator.clipboard.writeText(content);
    setShowMenu(null);
  };

  const getFileIcon = (fileName, mimeType) => {
    if (mimeType?.startsWith("image/")) return "🖼️";
    if (mimeType === "application/pdf") return "📕";
    if (
      mimeType?.includes("word") ||
      fileName?.endsWith(".doc") ||
      fileName?.endsWith(".docx")
    )
      return "📘";
    if (
      mimeType?.includes("excel") ||
      fileName?.endsWith(".xls") ||
      fileName?.endsWith(".xlsx")
    )
      return "📗";
    if (
      mimeType?.includes("powerpoint") ||
      fileName?.endsWith(".ppt") ||
      fileName?.endsWith(".pptx")
    )
      return "📙";
    if (
      mimeType?.includes("zip") ||
      mimeType?.includes("rar") ||
      fileName?.endsWith(".zip") ||
      fileName?.endsWith(".rar")
    )
      return "🗜️";
    if (mimeType === "text/plain" || fileName?.endsWith(".txt")) return "📝";
    return "📄";
  };

  const getMessageTypeIcon = (type) => {
    switch (type) {
      case "IMAGE":
        return "🖼️";
      case "FILE":
        return "📄";
      case "SYSTEM":
        return "🔔";
      default:
        return null;
    }
  };

  const renderMessageContent = (message) => {
    if (message.isDeleted) {
      return (
        <div className="italic text-gray-400 text-sm">
          This message was deleted
        </div>
      );
    }

    switch (message.type) {
      case "IMAGE":
        return (
          <div className="space-y-2">
            {message.fileUrl && (
              <img
                src={
                  message.fileUrl.startsWith("/")
                    ? `${
                        process.env.NEXT_PUBLIC_API_URL ||
                        "http://localhost:8080"
                      }${message.fileUrl}`
                    : message.fileUrl
                }
                alt={message.fileName || "Image"}
                className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => {
                  const fullUrl = message.fileUrl.startsWith("/")
                    ? `${
                        process.env.NEXT_PUBLIC_API_URL ||
                        "http://localhost:8080"
                      }${message.fileUrl}`
                    : message.fileUrl;
                  window.open(fullUrl, "_blank");
                }}
              />
            )}
            {message.content && !message.content.startsWith("[FILE:") && (
              <p className="whitespace-pre-wrap break-words">
                {message.content}
              </p>
            )}
          </div>
        );

      case "FILE":
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 bg-gray-600 rounded-lg max-w-xs">
              <span className="text-2xl">
                {getFileIcon(message.fileName, message.mimeType)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {message.fileName || "File"}
                </p>
                {message.fileSize && (
                  <p className="text-xs text-gray-400">
                    {message.fileSize > 1024 * 1024
                      ? `${(message.fileSize / (1024 * 1024)).toFixed(1)} MB`
                      : `${(message.fileSize / 1024).toFixed(1)} KB`}
                  </p>
                )}
              </div>
              {message.fileUrl && (
                <button
                  onClick={() => {
                    const fullUrl = message.fileUrl.startsWith("/")
                      ? `${
                          process.env.NEXT_PUBLIC_API_URL ||
                          "http://localhost:8080"
                        }${message.fileUrl}`
                      : message.fileUrl;
                    window.open(fullUrl, "_blank");
                  }}
                  className="text-xs bg-amber-500 text-black px-2 py-1 rounded hover:bg-amber-400 transition-colors flex items-center gap-1"
                >
                  <Download size={12} />
                  Open
                </button>
              )}
            </div>
            {message.content && !message.content.startsWith("[FILE:") && (
              <p className="whitespace-pre-wrap break-words">
                {message.content}
              </p>
            )}
          </div>
        );

      case "SYSTEM":
        return (
          <div className="flex items-center justify-center p-2">
            <div className="bg-gray-700 px-3 py-1 rounded-full text-xs text-gray-300 flex items-center gap-2">
              <span>🔔</span>
              {message.content}
            </div>
          </div>
        );

      default:
        return (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        );
    }
  };

  if (messages[0]?.type === "SYSTEM") {
    return renderMessageContent(messages[0]);
  }

  return (
    <div
      className={`flex gap-3 items-end ${
        isOwnMessage ? "justify-end" : "justify-start"
      }`}
    >
      {/* Avatar for incoming messages (left side) */}
      {!isOwnMessage && (
        <div className="flex-shrink-0">
          {senderAvatar ? (
            <img
              src={senderAvatar}
              alt={senderName}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-black font-semibold text-sm">
              {senderName?.charAt(0).toUpperCase() || "U"}
            </div>
          )}
        </div>
      )}

      <div className="max-w-xs lg:max-w-md">
        {/* Sender name for group messages or when showing names */}
        {showAvatar && !isOwnMessage && (
          <div className="text-xs text-gray-400 mb-1 px-1">
            {senderName} (@{senderUsername})
          </div>
        )}

        {/* Messages */}
        <div className="space-y-1">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`relative group ${
                isOwnMessage
                  ? "bg-amber-500 text-black"
                  : "bg-gray-700 text-white"
              } rounded-lg px-3 py-2 max-w-full overflow-hidden`}
              onDoubleClick={() => copyToClipboard(message.content)}
              title="Double-click to copy"
            >
              {renderMessageContent(message)}
            </div>
          ))}
        </div>

        {/* Timestamp */}
        <div
          className={`text-xs text-gray-300 mt-1 px-1 font-medium ${
            isOwnMessage ? "text-right" : "text-left"
          }`}
        >
          {formatTime(messages[messages.length - 1].timestamp)}
          {messages[messages.length - 1].editedAt && (
            <span className="ml-1 text-gray-400">(edited)</span>
          )}
        </div>
      </div>

      {/* Avatar for outgoing messages (right side) */}
      {isOwnMessage && (
        <div className="flex-shrink-0">
          {currentUserAvatar ? (
            <img
              src={currentUserAvatar}
              alt={senderName}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {senderName?.charAt(0).toUpperCase() || "Y"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
