"use client";

import { useState } from "react";
import { useGroupStore, useUIStore } from "@/store/useStore";
import Modal from "../ui/Modal";
import GroupForm from "../forms/GroupForm";

export default function CreateGroupModal({ isOpen, onClose }) {
  const [isLoading, setIsLoading] = useState(false);

  const { createGroup } = useGroupStore();
  const { addNotification } = useUIStore();


  const handleSubmit = async (formData) => {
    if (!formData.groupName.trim()) {
      addNotification({
        type: "error",
        title: "Group Name Required",
        message: "Please enter a group name",
        duration: 3000,
      });
      return;
    }

    if (formData.memberUsernames.length === 0) {
      addNotification({
        type: "error",
        title: "No Members Selected",
        message: "Please select at least one member for the group",
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await createGroup(formData);
      
      if (result.success) {
        addNotification({
          type: "success",
          title: "Group Created Successfully!",
          message: `"${formData.groupName}" created with ${formData.memberUsernames.length} members. All members will be notified automatically!`,
          duration: 5000,
        });
        
        onClose();
      }
    } catch (error) {
      const isPartialSuccess = error.message && error.message.includes("partially");
      
      addNotification({
        type: isPartialSuccess ? "warning" : "error",
        title: isPartialSuccess ? "Group Created with Issues" : "Failed to Create Group",
        message: error.message || "Please check your connection and try again",
        duration: 5000,
      });
      
      if (isPartialSuccess) {
        onClose();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Group" size="lg">
      <GroupForm
        onSubmit={handleSubmit}
        loading={isLoading}
        submitText="Create Group"
      />
    </Modal>
  );
}