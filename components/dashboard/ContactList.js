"use client";

import { useState, useEffect } from "react";
import { useContactStore, useUIStore, useChatStore } from "@/store/useStore";
import {
  UserPlus,
  Search,
  MoreVertical,
  MessageCircle,
  UserX,
  Shield,
} from "lucide-react";
import StatusIndicator from "../ui/StatusIndicator";

export default function ContactList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeMenu, setActiveMenu] = useState(null);
  const { contacts, removeContact, loadContacts, isLoading, blockUser } =
    useContactStore();
  const { setActiveModal, addNotification } = useUIStore();
  const { setActiveConversation, deleteChat } = useChatStore();

  // Load contacts on mount
  useEffect(() => {
    console.log("ContactList: Loading contacts...");
    loadContacts();
  }, [loadContacts]);

  const filteredContacts = contacts.filter(
    (contact) =>
      contact &&
      contact.fullName &&
      contact.username &&
      (contact.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleStartChat = (contact) => {
    console.log("Starting chat with contact:", contact);
    const conversation = {
      id: `user-${contact.id}`,
      type: "private",
      name: contact.fullName,
      username: contact.username,
      avatar: contact.avatarUrl,
      status: contact.status,
      user: contact,
    };
    console.log("Created conversation:", conversation);
    setActiveConversation(conversation);
    console.log("Set active conversation");
    setActiveMenu(null);
  };

  const handleRemoveContact = async (contactId) => {
    try {
      await removeContact(contactId);
      addNotification({
        type: "success",
        title: "Contact Removed",
        message: "Contact has been removed successfully",
        duration: 3000,
      });
    } catch (error) {
      addNotification({
        type: "error",
        title: "Error",
        message: error.message || "Failed to remove contact",
        duration: 5000,
      });
    }
    setActiveMenu(null);
  };

  const handleBlockUser = async (contact) => {
    try {
      // Block the user
      await blockUser(contact.username, `Blocked by user`);

      // Delete the chat conversation
      const conversation = {
        type: "private",
        user: contact,
      };
      await deleteChat(conversation);

      // Reload contacts to remove blocked user from list
      await loadContacts();

      addNotification({
        type: "success",
        title: "User Blocked",
        message: `${
          contact.fullName || contact.username
        } has been blocked and chat deleted`,
        duration: 4000,
      });
    } catch (error) {
      addNotification({
        type: "error",
        title: "Error",
        message: error.message || "Failed to block user",
        duration: 5000,
      });
    }
    setActiveMenu(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Contacts</h2>
          <button
            onClick={() => setActiveModal("addContact")}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-amber-500"
          >
            <UserPlus size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
            <div className="ml-3 text-gray-400">Loading contacts...</div>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            {searchTerm ? (
              <p className="text-sm">
                No contacts found matching &quot;{searchTerm}&quot;
              </p>
            ) : (
              <>
                <div className="mb-4 text-4xl opacity-50">👥</div>
                <p className="text-sm">No contacts yet</p>
                <button
                  onClick={() => setActiveModal("addContact")}
                  className="mt-2 text-amber-500 hover:text-amber-400 text-sm underline"
                >
                  Add your first contact
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredContacts.map((contact) => (
              <div key={contact.id} className="relative">
                <div className="p-4 hover:bg-gray-700 transition-colors">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      {contact.avatarUrl ? (
                        <img
                          src={contact.avatarUrl}
                          alt={contact.fullName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-black font-semibold">
                          {contact.fullName
                            ? contact.fullName.charAt(0).toUpperCase()
                            : "?"}
                        </div>
                      )}
                      <div className="absolute -right-0.5 bottom-0.5">
                        <StatusIndicator status={contact.status} size="sm" />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">
                        {contact.fullName || "Unknown User"}
                      </h3>
                      <p className="text-sm text-gray-400 truncate">
                        @{contact.username || "unknown"}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStartChat(contact)}
                        className="p-2 hover:bg-gray-600 rounded-lg transition-colors text-amber-500"
                        title="Start chat"
                      >
                        <MessageCircle size={16} />
                      </button>

                      <div className="relative">
                        <button
                          onClick={() =>
                            setActiveMenu(
                              activeMenu === contact.id ? null : contact.id
                            )
                          }
                          className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {activeMenu === contact.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActiveMenu(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20">
                              <button
                                onClick={() => handleStartChat(contact)}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700 transition-colors text-sm"
                              >
                                <MessageCircle size={14} />
                                Start Chat
                              </button>
                              <button
                                onClick={() => handleBlockUser(contact)}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-600 transition-colors text-sm text-orange-400 hover:text-white"
                              >
                                <Shield size={14} />
                                Block User
                              </button>
                              <button
                                onClick={() => handleRemoveContact(contact.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-600 transition-colors text-sm text-red-400 hover:text-white"
                              >
                                <UserX size={14} />
                                Remove Contact
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
