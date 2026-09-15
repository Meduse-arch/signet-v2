import React from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'glass' | 'ghost' | 'white';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({ 
  children, 
  variant = 'primary', 
  loading = false, 
  leftIcon,
  rightIcon,
  className = '', 
  disabled, 
  ...props 
}: ButtonProps) {
  
  const baseClasses = "font-bold transition-all inline-flex items-center justify-center gap-2 whitespace-nowrap group select-none flex-shrink-0";
  
  const variants: Record<ButtonVariant, string> = {
    primary: "w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] px-6 py-4 rounded-xl text-base",
    glass:   "bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-100 border border-indigo-500/30 hover:border-indigo-400 backdrop-blur-md rounded-lg px-6 py-3",
    ghost:   "text-sm text-white/80 hover:text-white bg-black/20 hover:bg-white/10 rounded-full border border-white/10 backdrop-blur-md px-5 py-2",
    white:   "bg-white text-black hover:bg-slate-200 rounded-lg px-6 py-3",
  };

  const finalDisabled = loading || disabled;

  return (
    <button
      disabled={finalDisabled}
      className={[
        baseClasses,
        variants[variant],
        finalDisabled ? 'opacity-50 cursor-not-allowed' : '',
        className
      ].join(' ')}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : leftIcon ? (
        <span className="flex-shrink-0 flex items-center">{leftIcon}</span>
      ) : null}

      {children && (
        <span className="flex-shrink-0">{children}</span>
      )}

      {!loading && rightIcon && (
        <span className="flex-shrink-0 flex items-center">{rightIcon}</span>
      )}
    </button>
  );
}
