import React from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'glass' | 'ghost' | 'white';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  loading = false, 
  leftIcon,
  rightIcon,
  className = '', 
  disabled, 
  ...props 
}: ButtonProps) {
  
  const baseClasses = "font-bold transition-all inline-flex items-center justify-center gap-2 whitespace-nowrap group select-none flex-shrink-0";
  
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.3)] hover:shadow-[0_0_30px_rgba(225,29,72,0.5)] rounded-sm border border-rose-500/50",
    glass:   "bg-rose-600/20 hover:bg-rose-600/40 text-rose-100 border border-rose-500/30 hover:border-rose-400 backdrop-blur-md rounded-sm",
    ghost:   "text-white/80 hover:text-white bg-black/20 hover:bg-white/10 rounded-sm border border-white/10 backdrop-blur-md",
    white:   "bg-white text-black hover:bg-zinc-200 rounded-sm border border-white/20",
  };

  const sizes: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
    icon: "p-2",
  };

  const finalDisabled = loading || disabled;

  return (
    <button
      disabled={finalDisabled}
      className={[
        baseClasses,
        variants[variant],
        sizes[size],
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
