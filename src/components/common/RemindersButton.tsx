import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import Button from '../ui/Button';
import ReminderPanel from './ReminderPanel';
import { ReminderModule } from '../../utils/reminders';

interface RemindersButtonProps {
  module: ReminderModule;
  className?: string;
}

const RemindersButton: React.FC<RemindersButtonProps> = ({ module, className }) => {
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
      >
        <Bell className="h-4 w-4 mr-2" />
        Reminders
      </Button>

      {isOpen && (
        <ReminderPanel
          ref={panelRef}
          module={module}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default RemindersButton;