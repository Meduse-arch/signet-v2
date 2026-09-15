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
        <label className="block text-sm font-semibold text-slate-300 mb-2">
          {label}
        </label>
      )}
      <div className="flex items-center bg-slate-900/80 border border-slate-700/80 rounded-xl px-4 py-3.5 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all shadow-inner">
        {icon && (
          <div className="text-slate-500 shrink-0 mr-3 flex items-center">
            {icon}
          </div>
        )}
        <input
          {...props}
          className={`w-full bg-transparent text-white placeholder-slate-600 focus:outline-none ${props.className || ''}`}
        />
      </div>
    </div>
  );
}
