import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  label?: string;
}

export function Input({ 
  icon, 
  label, 
  className = '', 
  ...props 
}: InputProps) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-semibold text-zinc-300 mb-2">
          {label}
        </label>
      )}
      <div className="flex items-center bg-surface-raised border border-hairline rounded-lg px-4 h-12 focus-within:border-rose-500 focus-within:ring-1 focus-within:ring-rose-500 transition-colors">
        {icon && (
          <div className="text-zinc-500 shrink-0 mr-3 flex items-center">
            {icon}
          </div>
        )}
        <input
          {...props}
          className="w-full bg-transparent text-white placeholder-zinc-600 focus:outline-none"
        />
      </div>
    </div>
  );
}
