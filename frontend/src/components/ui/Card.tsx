import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  badge?: string;
  imageUrl?: string;
}

export function Card({ 
  title, 
  subtitle, 
  badge, 
  imageUrl, 
  className = '', 
  children,
  ...props 
}: CardProps) {
  return (
    <div 
      className={`group relative min-w-[250px] sm:min-w-[280px] h-[150px] rounded-xl overflow-hidden cursor-pointer transition-all hover:scale-[1.02] border border-white/10 hover:border-white/30 shadow-lg ${className}`}
      {...props}
    >
      {imageUrl && (
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110 opacity-70" 
          style={{ backgroundImage: `url("${imageUrl}")` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      
      <div className="absolute inset-0 p-4 flex flex-col justify-end">
        {badge && (
          <span className="text-xs font-bold text-indigo-300 mb-1 drop-shadow-md tracking-wider">
            {badge}
          </span>
        )}
        <span className="text-lg font-bold text-white leading-tight drop-shadow-md mb-1">
          {title}
        </span>
        {subtitle && (
          <span className="text-xs text-slate-300 drop-shadow-md">
            {subtitle}
          </span>
        )}
      </div>
      
      {children}
    </div>
  );
}
