import { useChatStore } from "@/store/useStore";

export default function TypingIndicator({ conversation, currentUser }) {
  const { typingUsers } = useChatStore();

  if (!conversation) return null;

  const conversationTypingUsers = typingUsers[conversation.id] || [];
  const filteredTypingUsers = conversationTypingUsers.filter(
    (username) => username !== currentUser?.username
  );

  if (filteredTypingUsers.length === 0) return null;

  const getTypingText = () => {
    if (filteredTypingUsers.length === 1) {
      return `${filteredTypingUsers[0]} is typing...`;
    } else if (filteredTypingUsers.length === 2) {
      return `${filteredTypingUsers[0]} and ${filteredTypingUsers[1]} are typing...`;
    } else {
      return `${filteredTypingUsers.length} people are typing...`;
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0">
        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
          <div className="flex gap-1">
            <div
              className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <div
              className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-700 rounded-lg px-3 py-2 max-w-xs">
        <p className="text-sm text-gray-400 italic">{getTypingText()}</p>
      </div>
    </div>
  );
}
