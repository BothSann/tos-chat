"use client";

import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import { formatDistanceToNow, isToday, isYesterday, format } from "date-fns";
import { useContactStore } from "@/store/useStore";

export default function MessageList({
  messages = [],
  currentUser,
  conversation,
  messagesEndRef,
}) {
  // Get contacts to cross-reference avatar URLs for group messages
  const { contacts } = useContactStore();

  // Helper function to find avatar URL for a sender
  const findSenderAvatar = (senderId, senderUsername) => {
    // First try to find by ID
    if (senderId) {
      const contactById = contacts.find((contact) => contact.id === senderId);
      if (contactById?.avatarUrl) return contactById.avatarUrl;
    }

    // Then try to find by username
    if (senderUsername) {
      const contactByUsername = contacts.find(
        (contact) => contact.username === senderUsername
      );
      if (contactByUsername?.avatarUrl) return contactByUsername.avatarUrl;
    }

    return null;
  };

  // Simple scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const formatMessageDate = (timestamp) => {
    if (!timestamp) return "Unknown date";

    try {
      let date;

      // Handle array format from Java LocalDateTime: [year, month, day, hour, minute, second, nanosecond]
      if (Array.isArray(timestamp) && timestamp.length >= 6) {
        const [year, month, day, hour, minute, second, nanosecond] = timestamp;
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
        date = new Date(timestamp);
      }

      if (isNaN(date.getTime())) {
        return "Unknown date";
      }

      if (isToday(date)) {
        return "Today";
      } else if (isYesterday(date)) {
        return "Yesterday";
      } else {
        return format(date, "MMM dd, yyyy");
      }
    } catch (error) {
      console.warn("Invalid message date timestamp:", timestamp, error);
      return "Unknown date";
    }
  };

  const convertTimestamp = (timestamp) => {
    if (Array.isArray(timestamp) && timestamp.length >= 6) {
      const [year, month, day, hour, minute, second, nanosecond] = timestamp;
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

  const shouldShowDateSeparator = (currentMessage, previousMessage) => {
    if (!previousMessage) return true;

    // Validate timestamps before creating dates
    if (!currentMessage.timestamp || !previousMessage.timestamp) {
      return false;
    }

    try {
      const currentDate = convertTimestamp(currentMessage.timestamp);
      const previousDate = convertTimestamp(previousMessage.timestamp);

      // Check if dates are valid
      if (isNaN(currentDate.getTime()) || isNaN(previousDate.getTime())) {
        return false;
      }

      return currentDate.toDateString() !== previousDate.toDateString();
    } catch (error) {
      console.warn(
        "Invalid timestamps in date separator check:",
        {
          current: currentMessage.timestamp,
          previous: previousMessage.timestamp,
        },
        error
      );
      return false;
    }
  };

  const getTimeDifference = (timestamp1, timestamp2) => {
    if (!timestamp1 || !timestamp2) return Infinity;

    try {
      const date1 = convertTimestamp(timestamp1);
      const date2 = convertTimestamp(timestamp2);

      if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
        return Infinity;
      }

      return Math.abs(date1.getTime() - date2.getTime());
    } catch (error) {
      console.warn(
        "Invalid timestamps in time difference calculation:",
        {
          timestamp1,
          timestamp2,
        },
        error
      );
      return Infinity;
    }
  };

  const groupedMessages = [];
  let currentGroup = null;

  messages.forEach((message, index) => {
    const showDateSeparator = shouldShowDateSeparator(
      message,
      messages[index - 1]
    );

    if (showDateSeparator && index > 0) {
      groupedMessages.push({
        type: "date",
        date: formatMessageDate(message.timestamp),
        key: `date-${index}`,
      });
    }

    // Group consecutive messages from the same sender
    if (
      currentGroup &&
      currentGroup.senderId === message.senderId &&
      !showDateSeparator &&
      getTimeDifference(
        message.timestamp,
        currentGroup.messages[currentGroup.messages.length - 1].timestamp
      ) < 300000 // 5 minutes
    ) {
      currentGroup.messages.push(message);
    } else {
      if (currentGroup) {
        groupedMessages.push(currentGroup);
      }

      currentGroup = {
        type: "message",
        senderId: message.senderId,
        senderName:
          message.senderFullName || message.senderUsername || "Unknown User",
        senderUsername: message.senderUsername || "unknown",
        senderAvatar: message.senderAvatarUrl,
        messages: [message],
        key: `group-${message.id}`,
      };
    }
  });

  if (currentGroup) {
    groupedMessages.push(currentGroup);
  }

  if (messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center text-gray-400">
          <div className="mb-4 text-4xl opacity-50">💬</div>
          <p className="text-sm">
            {conversation?.type === "group"
              ? "Start the conversation in this group"
              : `Start your conversation with ${conversation?.name}`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="min-h-full flex flex-col justify-end p-4">
        <div className="space-y-4">
          {groupedMessages.map((item) => {
          if (item.type === "date") {
            return (
              <div key={item.key} className="flex justify-center">
                <div className="bg-gray-700 px-3 py-1 rounded-full text-xs text-gray-300">
                  {item.date}
                </div>
              </div>
            );
          }

          const isOwnMessage = item.senderId === currentUser?.id;

          // Get avatar URL - try multiple sources
          const senderAvatar =
            item.senderAvatar ||
            item.messages[0]?.senderAvatarUrl ||
            (conversation?.type === "private" && !isOwnMessage
              ? conversation?.user?.avatarUrl
              : null) ||
            // For group messages, try to find avatar from contacts
            (conversation?.type === "group" && !isOwnMessage
              ? findSenderAvatar(item.senderId, item.senderUsername)
              : null);

          // Debug logging for avatar resolution
          if (
            conversation?.type === "group" &&
            !isOwnMessage &&
            !senderAvatar
          ) {
            console.log(
              `💾 Avatar lookup for ${item.senderName} (${item.senderUsername}):`,
              {
                senderId: item.senderId,
                senderUsername: item.senderUsername,
                messageAvatarUrl: item.messages[0]?.senderAvatarUrl,
                contactsCount: contacts.length,
                foundContact: contacts.find(
                  (c) =>
                    c.id === item.senderId || c.username === item.senderUsername
                ),
              }
            );
          }

          return (
            <MessageBubble
              key={item.key}
              messages={item.messages}
              senderName={item.senderName}
              senderUsername={item.senderUsername}
              senderAvatar={senderAvatar}
              currentUserAvatar={currentUser?.avatarUrl}
              isOwnMessage={isOwnMessage}
              showAvatar={!isOwnMessage}
            />
          );
        })}

        {/* Typing Indicator */}
        <TypingIndicator
          conversation={conversation}
          currentUser={currentUser}
        />

          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}
