"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import Logo from "@/components/Logo";
import Link from "next/link";
import { apiService } from "@/services/api";
import { useUIStore } from "@/store/useStore";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { addNotification } = useUIStore();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
  } = useForm();

  const password = watch("password");

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      const { confirmPassword, ...registerData } = data;

      // Call API directly instead of using store register method to avoid auto-login
      const response = await apiService.register(registerData);
      
      if (response.success) {
        addNotification({
          type: "success",
          title: "Account Created Successfully!",
          message: "Please log in with your credentials",
          duration: 4000,
        });

        // Redirect to login page instead of auto-logging in
        router.push("/login");
      } else {
        throw new Error(response.message || "Registration failed");
      }
    } catch (error) {
      setIsLoading(false);
      const errorMessage =
        error.response?.data?.message || error.message || "Registration failed";

      if (error.response?.data?.error === "VALIDATION_ERROR") {
        const field = error.response?.data?.field || "username";
        setError(field, { message: errorMessage });
      } else {
        addNotification({
          type: "error",
          title: "Registration Failed",
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
        <h2 className="text-center font-bold text-2xl">Create an account</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-12">
          {/* Full name */}
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-gray-300"
            >
              Full name
            </label>
            <div className="mt-2">
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
                    value: 100,
                    message: "Full name cannot exceed 100 characters",
                  },
                })}
                className={`bg-white/5 block w-full rounded-md px-3 py-1.5 outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-amber-500 sm:text-sm/6 ${
                  errors.fullName ? "outline-red-500 focus:outline-red-500" : ""
                }`}
                placeholder="Enter your full name"
              />
              {errors.fullName && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.fullName.message}
                </p>
              )}
            </div>
          </div>

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
                {...register("username", {
                  required: "Username is required",
                  minLength: {
                    value: 3,
                    message: "Username must be at least 3 characters",
                  },
                  maxLength: {
                    value: 50,
                    message: "Username cannot exceed 50 characters",
                  },
                  pattern: {
                    value: /^[a-zA-Z0-9_]+$/,
                    message:
                      "Username can only contain letters, numbers, and underscores",
                  },
                })}
                className={`bg-white/5 block w-full rounded-md px-3 py-1.5 outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-amber-500 sm:text-sm/6 ${
                  errors.username ? "outline-red-500 focus:outline-red-500" : ""
                }`}
                placeholder="Choose a username"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.username.message}
                </p>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-300"
            >
              Email address
            </label>
            <div className="mt-2">
              <input
                type="email"
                id="email"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address",
                  },
                })}
                className={`bg-white/5 block w-full rounded-md px-3 py-1.5 outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-amber-500 sm:text-sm/6 ${
                  errors.email ? "outline-red-500 focus:outline-red-500" : ""
                }`}
                placeholder="Enter your email address"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.email.message}
                </p>
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
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 6,
                    message: "Password must be at least 6 characters",
                  },
                })}
                className={`bg-white/5 block w-full rounded-md px-3 py-1.5 pr-10 outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-amber-500 sm:text-sm/6 ${
                  errors.password ? "outline-red-500 focus:outline-red-500" : ""
                }`}
                placeholder="Choose a password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.password.message}
                </p>
              )}
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-300"
            >
              Confirm password
            </label>
            <div className="mt-2 relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                {...register("confirmPassword", {
                  required: "Please confirm your password",
                  validate: (value) =>
                    value === password || "Passwords do not match",
                })}
                className={`bg-white/5 block w-full rounded-md px-3 py-1.5 pr-10 outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-amber-500 sm:text-sm/6 ${
                  errors.confirmPassword
                    ? "outline-red-500 focus:outline-red-500"
                    : ""
                }`}
                placeholder="Confirm your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>

          {/* Create account button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="text-sm font-semibold bg-amber-500 w-full px-4 py-2 rounded-md hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-black"
            >
              {isLoading && <Loader2 className="animate-spin" size={16} />}
              {isLoading ? "Creating account..." : "Create account"}
            </button>
          </div>
        </form>

        <p className="mt-10 text-center text-sm/6 text-gray-400 flex justify-center items-center gap-1">
          Already have an account?
          <Link
            href="/login"
            className="font-semibold text-amber-500 hover:text-amber-400 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </>
  );
}