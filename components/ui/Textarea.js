'use client';

import { forwardRef } from 'react';

const Textarea = forwardRef(({
  label,
  error,
  required = false,
  disabled = false,
  className = '',
  id,
  placeholder,
  rows = 3,
  maxLength,
  ...props
}, ref) => {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-2">
          {label} {required && '*'}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
        className={`bg-gray-700 block w-full rounded-md px-3 py-2 border ${
          error ? 'border-red-500' : 'border-gray-600'
        } focus:border-amber-500 focus:outline-none text-white placeholder-gray-400 resize-none disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        placeholder={placeholder}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Textarea;