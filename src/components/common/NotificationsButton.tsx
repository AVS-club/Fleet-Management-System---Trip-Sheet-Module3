import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import Button from '../ui/Button';
import NotificationsPanel from './NotificationsPanel';
import { ReminderModule } from '../../utils/reminders';

interface NotificationsButtonProps {
  module: ReminderModule;
  className?: string;
  count?: number;
  iconOnly?: boolean;
}

const NotificationsButton: React.FC<NotificationsButtonProps> = ({ 
  module, 
  className, 
  count,
  iconOnly = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close the panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        buttonRef.current &&
        panelRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close the panel when pressing Escape
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (isOpen && event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen]);

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={className}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="View Notifications"
        size="sm"
      >
        <Bell className="h-4 w-4" />
        {!iconOnly && <span className="ml-2">Notifications</span>}
        {count && count > 0 && (
          <span className="ml-1 px-1.5 py-0.5 text-[10px] sm:text-xs font-medium rounded-full bg-error-500 text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </Button>

      {isOpen && (
        <NotificationsPanel
          ref={panelRef}
          module={module}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default NotificationsButton;