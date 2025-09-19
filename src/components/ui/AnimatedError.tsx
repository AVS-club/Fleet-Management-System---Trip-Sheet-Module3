import React from 'react';
import { AlertCircle } from 'lucide-react';
import { ANIMATIONS } from '@/utils/animations';

interface AnimatedErrorProps {
  message: string;
  className?: string;
}

const AnimatedError: React.FC<AnimatedErrorProps> = ({ message, className = '' }) => {
  return (
    <div className={`overflow-hidden ${className}`}>
      <div 
        className="animate-in slide-in-from-top-1 fade-in duration-200"
        style={ANIMATIONS.createAnimationStyle('slideInFromTop', 200)}
      >
        <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
          <AlertCircle className="h-3 w-3 animate-pulse" />
          {message}
        </p>
      </div>
    </div>
  );
};

export default AnimatedError;
