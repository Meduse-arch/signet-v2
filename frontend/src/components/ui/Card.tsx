import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  badge?: string;
  imageUrl?: string;
  imageHue?: string;
}

export function Card({ 
  title, 
  subtitle, 
  badge, 
  imageUrl, 
  imageHue,
  className = '', 
  children,
  ...props 
}: CardProps) {
  return (
    <div 
      className={`group relative min-w-[250px] sm:min-w-[280px] h-[150px] rounded-sm overflow-hidden cursor-pointer transition-all hover:scale-[1.02] border border-zinc-800 hover:border-zinc-500 shadow-lg ${className}`}
      {...props}
    >
      {imageUrl && (
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110 opacity-70" 
          style={{ 
            backgroundImage: `url("${imageUrl}")`, 
            filter: imageHue ? `hue-rotate(${imageHue})` : undefined 
          }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      
      <div className="absolute inset-0 p-4 flex flex-col justify-end">
        {badge && (
          <span className="text-xs font-bold text-rose-300 mb-1 drop-shadow-md tracking-wider">
            {badge}
          </span>
        )}
        <span className="text-lg font-bold text-white leading-tight drop-shadow-md mb-1">
          {title}
        </span>
        {subtitle && (
          <span className="text-xs text-zinc-300 drop-shadow-md">
            {subtitle}
          </span>
        )}
      </div>
      
      {children}
    </div>
  );
}
