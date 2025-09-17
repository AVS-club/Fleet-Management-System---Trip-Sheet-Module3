import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Toast, { ToastProps, ToastAction } from './EnhancedToast';

export interface ToastOptions {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  actions?: ToastAction[];
  persistent?: boolean;
}

interface ToastContextType {
  showToast: (options: ToastOptions) => string;
  hideToast: (id: string) => void;
  hideAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ 
  children, 
  maxToasts = 5 
}) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const showToast = useCallback((options: ToastOptions): string => {
    const id = Math.random().toString(36).substr(2, 9);
    
    const newToast: ToastProps = {
      id,
      ...options,
      onClose: hideToast
    };

    setToasts(prevToasts => {
      const updatedToasts = [newToast, ...prevToasts];
      // Limit the number of toasts
      return updatedToasts.slice(0, maxToasts);
    });

    return id;
  }, [maxToasts]);

  const hideToast = useCallback((id: string) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  const hideAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const contextValue: ToastContextType = {
    showToast,
    hideToast,
    hideAllToasts
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {typeof window !== 'undefined' && createPortal(
        <ToastPortal toasts={toasts} />,
        document.body
      )}
    </ToastContext.Provider>
  );
};

interface ToastPortalProps {
  toasts: ToastProps[];
}

const ToastPortal: React.FC<ToastPortalProps> = ({ toasts }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} />
        </div>
      ))}
    </div>
  );
};

// Convenience hooks for common toast types
export const useSuccessToast = () => {
  const { showToast } = useToast();
  return useCallback((title: string, message?: string, options?: Partial<ToastOptions>) => {
    return showToast({
      type: 'success',
      title,
      message,
      duration: 4000,
      ...options
    });
  }, [showToast]);
};

export const useErrorToast = () => {
  const { showToast } = useToast();
  return useCallback((title: string, message?: string, options?: Partial<ToastOptions>) => {
    return showToast({
      type: 'error',
      title,
      message,
      duration: 6000,
      persistent: true,
      ...options
    });
  }, [showToast]);
};

export const useWarningToast = () => {
  const { showToast } = useToast();
  return useCallback((title: string, message?: string, options?: Partial<ToastOptions>) => {
    return showToast({
      type: 'warning',
      title,
      message,
      duration: 5000,
      ...options
    });
  }, [showToast]);
};

export const useInfoToast = () => {
  const { showToast } = useToast();
  return useCallback((title: string, message?: string, options?: Partial<ToastOptions>) => {
    return showToast({
      type: 'info',
      title,
      message,
      duration: 4000,
      ...options
    });
  }, [showToast]);
};
