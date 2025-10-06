import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';
import { ANIMATIONS } from '@/utils/animations';

interface AnimatedToastProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  onClose?: () => void;
  className?: string;
}

const AnimatedToast: React.FC<AnimatedToastProps> = ({
  type,
  message,
  duration = 5000,
  onClose,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300);
  }, [onClose]);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, handleClose]);

  if (!isVisible) return null;

  const typeConfig = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-500',
      textColor: 'text-white',
      iconColor: 'text-green-100',
    },
    error: {
      icon: AlertCircle,
      bgColor: 'bg-red-500',
      textColor: 'text-white',
      iconColor: 'text-red-100',
    },
    warning: {
      icon: AlertCircle,
      bgColor: 'bg-yellow-500',
      textColor: 'text-white',
      iconColor: 'text-yellow-100',
    },
    info: {
      icon: AlertCircle,
      bgColor: 'bg-blue-500',
      textColor: 'text-white',
      iconColor: 'text-blue-100',
    },
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 max-w-sm w-full
        ${isExiting ? 'animate-out slide-out-to-right-full fade-out' : 'animate-in slide-in-from-right-full fade-in'}
        duration-300
        ${className}
      `}
    >
      <div
        className={`
          px-4 py-3 rounded-lg shadow-lg
          ${config.bgColor} ${config.textColor}
          flex items-start space-x-3
          ${ANIMATIONS.CLASSES.TRANSITION_SMOOTH}
        `}
      >
        <Icon className={`h-5 w-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
        
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        
        <button
          onClick={handleClose}
          className={`
            flex-shrink-0 p-1 rounded-full
            hover:bg-black hover:bg-opacity-10
            ${ANIMATIONS.CLASSES.TRANSITION_SMOOTH}
          `}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// Toast manager for handling multiple toasts
export const ToastManager: React.FC = () => {
  const [toasts, setToasts] = useState<Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    duration?: number;
  }>>([]);

  const addToast = (toast: Omit<typeof toasts[0], 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <AnimatedToast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

export default AnimatedToast;

