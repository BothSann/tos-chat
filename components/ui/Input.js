'use client';

import { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  error,
  required = false,
  disabled = false,
  className = '',
  id,
  type = 'text',
  placeholder,
  ...props
}, ref) => {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-2">
          {label} {required && '*'}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        id={id}
        disabled={disabled}
        className={`bg-gray-700 block w-full rounded-md px-3 py-2 border ${
          error ? 'border-red-500' : 'border-gray-600'
        } focus:border-amber-500 focus:outline-none text-white placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        placeholder={placeholder}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;