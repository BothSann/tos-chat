"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import Logo from "@/components/Logo";
import Link from "next/link";
import { apiService } from "@/services/api";
import { useUIStore, useAuthStore } from "@/store/useStore";
import { Loader2, Eye, EyeOff, AlertTriangle } from "lucide-react";

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [usernameError, setUsernameError] = useState(null);
  const [passwordError, setPasswordError] = useState(null);
  const [banMessage, setBanMessage] = useState(null);
  const { addNotification } = useUIStore();
  const { login: loginUser } = useAuthStore();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm();

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      setUsernameError(null); // Clear any previous username errors
      setPasswordError(null); // Clear any previous password errors
      setBanMessage(null); // Clear any previous ban message
      clearErrors(); // Clear form validation errors

      // Use the Zustand store login method
      const result = await loginUser(data);

      addNotification({
        type: "success",
        title: "Welcome back!",
        message: "Successfully logged in",
        duration: 3000,
      });

      // Navigate based on user role
      const userData = result.user || useAuthStore.getState().user;
      console.log("🔍 Login - User data after login:", userData);
      console.log("🔍 Login - User role:", userData?.role);
      console.log("🔍 Login - User isAdmin:", userData?.isAdmin);
      const destination = userData?.role === "ADMIN" ? "/admin" : "/dashboard";
      console.log("🔍 Login - Destination:", destination);
      router.push(destination);
    } catch (error) {
      setIsLoading(false);

      // Extract error message from different possible sources
      let errorMessage = "Login failed";
      let errorType = "general";

      if (error.response) {
        // HTTP error response from server
        const { status, data } = error.response;

        if (status === 401) {
          errorMessage = "Invalid username or password";
          errorType = "credentials";
        } else if (status === 403) {
          // Check if it's a banned user
          if (data?.banned === true || data?.isBanned === true) {
            errorMessage = data?.banReason
              ? `Your account has been banned. Reason: ${data.banReason}`
              : "Your account has been banned. Please contact support.";
            errorType = "banned";
          } else {
            errorMessage = "Account is disabled or access denied";
            errorType = "account";
          }
        } else if (status === 429) {
          errorMessage = "Too many login attempts. Please try again later";
          errorType = "rate_limit";
        } else {
          errorMessage = data?.message || data?.error || "Login failed";
        }
      } else if (
        error.code === "NETWORK_ERROR" ||
        error.message?.includes("Network")
      ) {
        errorMessage = "Cannot connect to server. Please check your connection";
        errorType = "network";
      } else {
        errorMessage = error.message || "An unexpected error occurred";

        // Check if it's a banned user error from the store
        if (error.message?.startsWith("BANNED:")) {
          errorMessage = error.message.replace("BANNED: ", "");
          errorType = "banned";
        }
      }

      // Handle different error types appropriately
      if (errorType === "credentials") {
        // Set field-specific errors for credential issues
        setUsernameError(errorMessage);
        setPasswordError(errorMessage);
        setError("username", { message: " " }); // Empty space to show red border
        setError("password", { message: " " }); // Empty space to show red border
      } else if (errorType === "banned") {
        // For banned users, show notification and set ban message
        // Don't reset loading state immediately to prevent form flicker
        setUsernameError("");
        setPasswordError("");
        setBanMessage(errorMessage);
        clearErrors();
        addNotification({
          type: "error",
          title: "Account Banned",
          message: errorMessage,
          duration: 10000, // Longer duration for ban message
        });
        // Reset loading state after a delay to show ban message properly
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
      } else {
        // For other errors, show notification and field errors
        setUsernameError(errorMessage);
        setPasswordError(errorMessage);
        addNotification({
          type: "error",
          title: "Login Failed",
          message: errorMessage,
          duration: 5000,
        });
      }
    }
  };

  return (
    <>
      <Logo />
      <div className="w-full max-w-md px-6 mt-6">
        <div className="space-y-6">
          <h2 className="text-center font-bold text-2xl">
            Sign in to your account
          </h2>

          {/* Ban Message Display */}
          {banMessage && (
            <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-red-200 font-semibold text-sm mb-1">
                  Account Banned
                </h3>
                <p className="text-red-300 text-sm leading-relaxed">
                  {banMessage}
                </p>
                <p className="text-red-400 text-xs mt-2">
                  If you believe this is an error, please contact support.
                </p>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-12">
          {/* Username */}
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-300"
            >
              Username
            </label>
            <div className="mt-2">
              <input
                type="text"
                id="username"
                disabled={banMessage}
                {...register("username", {
                  required: "Username is required",
                  minLength: {
                    value: 3,
                    message: "Username must be at least 3 characters",
                  },
                  onChange: () => {
                    // Clear username error and ban message when user starts typing
                    if (usernameError) setUsernameError(null);
                    if (banMessage) setBanMessage(null);
                  },
                })}
                className={`bg-white/5 block w-full rounded-md px-3 py-1.5 outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-amber-500 sm:text-sm/6 ${
                  errors.username || usernameError
                    ? "outline-red-500 focus:outline-red-500"
                    : ""
                } ${banMessage ? "opacity-50 cursor-not-allowed" : ""}`}
                placeholder="Enter your username"
              />
              {errors.username && (
                <p className="mt-2 text-sm text-red-400">
                  {errors.username.message}
                </p>
              )}
              {usernameError && (
                <p className="mt-2 text-sm text-red-400">{usernameError}</p>
              )}
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-300"
            >
              Password
            </label>
            <div className="mt-2 relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                disabled={banMessage}
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 6,
                    message: "Password must be at least 6 characters",
                  },
                  onChange: () => {
                    // Clear password error and ban message when user starts typing
                    if (passwordError) setPasswordError(null);
                    if (banMessage) setBanMessage(null);
                  },
                })}
                className={`bg-white/5 block w-full rounded-md px-3 py-1.5 pr-10 outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-amber-500 sm:text-sm/6 ${
                  errors.password || passwordError
                    ? "outline-red-500 focus:outline-red-500"
                    : ""
                } ${banMessage ? "opacity-50 cursor-not-allowed" : ""}`}
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              {errors.password && (
                <p className="mt-2 text-sm text-red-400">
                  {errors.password.message}
                </p>
              )}
              {passwordError && (
                <p className="mt-2 text-sm text-red-400">{passwordError}</p>
              )}
            </div>
          </div>

          {/* Login Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading || banMessage}
              className="text-sm font-semibold bg-amber-500 w-full px-4 py-2 rounded-md hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-black"
            >
              {isLoading && <Loader2 className="animate-spin" size={16} />}
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
        <p className="mt-10 text-center text-sm/6 text-gray-400 flex justify-center items-center gap-1">
          Don&apos;t have an account?
          <Link
            href="/register"
            className="font-semibold text-amber-500 hover:text-amber-400 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </>
  );
}
