import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface GlassmorphismPanelProps {
  children: React.ReactNode;
  className?: string;
  blur?: 'sm' | 'md' | 'lg' | 'xl';
  opacity?: number;
  borderColor?: string;
  animated?: boolean;
  hoverable?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: () => void;
}

export function GlassmorphismPanel({
  children,
  className,
  blur = 'md',
  opacity = 0.1,
  borderColor = 'rgba(255, 255, 255, 0.1)',
  animated = false,
  hoverable = false,
  onMouseEnter,
  onMouseLeave,
  onClick
}: GlassmorphismPanelProps) {
  const blurClasses = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
    xl: 'backdrop-blur-xl'
  };

  const Component = animated ? motion.div : 'div';
  const componentProps = animated ? {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  } : {};

  return (
    <Component
      {...componentProps}
      className={cn(
        'relative overflow-hidden rounded-lg',
        blurClasses[blur],
        hoverable && 'transition-all duration-300 hover:scale-[1.02] hover:shadow-xl',
        className
      )}
      style={{
        backgroundColor: `rgba(0, 0, 0, ${opacity})`,
        border: `1px solid ${borderColor}`,
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Animated border gradient */}
      {animated && (
        <div className="absolute inset-0 rounded-lg pointer-events-none">
          <div className="absolute inset-0 rounded-lg animate-pulse bg-gradient-to-r from-primary/20 via-transparent to-primary/20" />
        </div>
      )}
    </Component>
  );
}