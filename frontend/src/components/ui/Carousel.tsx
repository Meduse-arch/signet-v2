import React from 'react';
import { useHorizontalScroll } from '../../core/hooks/useHorizontalScroll';

interface CarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  enableMouseScroll?: boolean;
  className?: string;
}

export function Carousel({ children, enableMouseScroll = true, className = '', ...props }: CarouselProps) {
  const scrollRef = useHorizontalScroll<HTMLDivElement>();
  
  return (
    <div 
      ref={enableMouseScroll ? scrollRef : null} 
      className={`flex overflow-x-auto hide-scrollbar ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
