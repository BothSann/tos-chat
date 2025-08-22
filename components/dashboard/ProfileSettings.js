"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useAuthStore, useUIStore } from "@/store/useStore";
import { Camera, User, Loader2 } from "lucide-react";
import Modal from "../ui/Modal";

export default function ProfileSettings({ isOpen, onClose }) {
  const { user, updateProfile } = useAuthStore();
  const { addNotification } = useUIStore();
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm({
    defaultValues: {
      fullName: user?.fullName || "",
      email: user?.email || "",
    },
  });

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        addNotification({
          type: "error",
          title: "Invalid File Type",
          message: "Please select an image file",
          duration: 3000,
        });
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        addNotification({
          type: "error",
          title: "File Too Large",
          message: "Please select an image smaller than 5MB",
          duration: 3000,
        });
        return;
      }

      setSelectedFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);

      // Create FormData for profile update
      const formData = new FormData();
      formData.append("fullName", data.fullName);
      formData.append("email", data.email);
      
      if (selectedFile) {
        formData.append("profilePicture", selectedFile);
      }

      const result = await updateProfile(formData);
      
      if (result.success) {
        addNotification({
          type: "success",
          title: "Profile Updated",
          message: "Your profile has been updated successfully",
          duration: 3000,
        });
        
        // Reset form and close modal
        setPreviewImage(null);
        setSelectedFile(null);
        onClose();
      }
    } catch (error) {
      console.error("Profile update error:", error);
      
      let errorMessage = "Failed to update profile";
      let errorTitle = "Update Failed";
      
      // Handle specific error types
      if (error.response?.status === 400) {
        errorTitle = "Validation Error";
        errorMessage = error.response?.data?.message || "Please check your input and try again";
      } else if (error.response?.status === 413) {
        errorTitle = "File Too Large";
        errorMessage = "The selected image is too large. Please choose a smaller file (max 10MB)";
      } else if (error.response?.status === 415) {
        errorTitle = "Invalid File Type";
        errorMessage = "Please select a valid image file (JPEG, PNG, GIF, or WebP)";
      } else if (error.response?.status === 500) {
        errorTitle = "Server Error";
        errorMessage = "Something went wrong on our end. Please try again later";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      addNotification({
        type: "error",
        title: errorTitle,
        message: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      reset();
      setPreviewImage(null);
      setSelectedFile(null);
      onClose();
    }
  };

  const currentAvatar = previewImage || user?.avatarUrl;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Profile Settings" size="md">
      <div className="w-full max-w-md mx-auto">{/* Removed duplicate header */}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                {currentAvatar ? (
                  <img
                    src={currentAvatar}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={32} className="text-gray-400" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="absolute -bottom-1 -right-1 bg-amber-500 text-black p-2 rounded-full hover:bg-amber-400 transition-colors disabled:opacity-50"
              >
                <Camera size={16} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isLoading}
              />
            </div>
            <p className="text-sm text-gray-400 text-center">
              Click the camera icon to change your profile picture
              <br />
              <span className="text-xs">Max size: 5MB • JPG, PNG, GIF</span>
            </p>
          </div>

          {/* Full Name Field */}
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Full Name
            </label>
            <input
              type="text"
              id="fullName"
              {...register("fullName", {
                required: "Full name is required",
                minLength: {
                  value: 2,
                  message: "Full name must be at least 2 characters",
                },
                maxLength: {
                  value: 50,
                  message: "Full name must be less than 50 characters",
                },
              })}
              className={`bg-white/5 block w-full rounded-md px-3 py-2 outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-amber-500 sm:text-sm/6 ${
                errors.fullName ? "outline-red-500 focus:outline-red-500" : ""
              }`}
              placeholder="Enter your full name"
              disabled={isLoading}
            />
            {errors.fullName && (
              <p className="mt-1 text-sm text-red-400">
                {errors.fullName.message}
              </p>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              {...register("email", {
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Please enter a valid email address",
                },
              })}
              className={`bg-white/5 block w-full rounded-md px-3 py-2 outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-amber-500 sm:text-sm/6 ${
                errors.email ? "outline-red-500 focus:outline-red-500" : ""
              }`}
              placeholder="Enter your email address"
              disabled={isLoading}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-400">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Current User Info */}
          <div className="bg-gray-700/50 rounded-md p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Username:</span>
              <span className="text-white">{user?.username}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Role:</span>
              <span className="text-white">{user?.role || "USER"}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-sm font-medium text-black bg-amber-500 rounded-md hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="animate-spin" size={16} />}
              {isLoading ? "Updating..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}