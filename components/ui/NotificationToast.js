"use client";

import { useEffect } from "react";
import { useUIStore } from "@/store/useStore";
import {
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  Radio,
} from "lucide-react";

export default function NotificationToast({ notification }) {
  const { removeNotification } = useUIStore();

  useEffect(() => {
    if (notification.duration) {
      const timer = setTimeout(() => {
        removeNotification(notification.id);
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [notification.id, notification.duration, removeNotification]);

  const getIcon = () => {
    switch (notification.type) {
      case "success":
        return <CheckCircle size={20} className="text-green-500" />;
      case "error":
        return <XCircle size={20} className="text-red-500" />;
      case "warning":
        return <AlertCircle size={20} className="text-yellow-500" />;
      case "message":
        return <MessageSquare size={20} className="text-blue-500" />;
      case "system":
        return <Radio size={20} className="text-purple-500" />;
      case "broadcast":
        return <Radio size={20} className="text-amber-500" />;
      default:
        return <AlertCircle size={20} className="text-gray-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case "success":
        return "bg-green-900 border-green-700";
      case "error":
        return "bg-red-900 border-red-700";
      case "warning":
        return "bg-yellow-900 border-yellow-700";
      case "message":
        return "bg-blue-900 border-blue-700";
      case "system":
        return "bg-purple-900 border-purple-700";
      case "broadcast":
        return "bg-amber-900 border-amber-700";
      default:
        return "bg-gray-800 border-gray-600";
    }
  };

  return (
    <div
      className={`max-w-sm w-full border rounded-lg shadow-lg p-4 ${getBackgroundColor()} transform transition-all duration-300 ease-in-out`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {notification.title}
          </p>
          <p className="mt-1 text-sm text-gray-300 break-words">
            {notification.message}
          </p>
        </div>
        <div className="flex-shrink-0">
          <button
            onClick={() => removeNotification(notification.id)}
            className="rounded-md inline-flex text-gray-400 hover:text-gray-300 focus:outline-none transition-colors p-1 hover:bg-gray-700"
          >
            <span className="sr-only">Close</span>
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
