'use client';

import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  className = '',
  icon: Icon,
  ...props
}) {
  const baseClasses = 'font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';
  
  const variantClasses = {
    primary: 'bg-amber-500 text-black hover:bg-amber-400',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700',
    outline: 'border border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-gray-300 hover:text-white hover:bg-gray-700'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  const isDisabled = disabled || loading;
  
  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" size={16} />}
      {!loading && Icon && <Icon size={16} />}
      {children}
    </button>
  );
}