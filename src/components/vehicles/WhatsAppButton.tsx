import React from 'react';
import { MessageSquare } from 'lucide-react';
import Button from '../ui/Button';

interface WhatsAppButtonProps {
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'warning';
}

const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  onClick,
  className = '',
  variant = 'outline'
}) => {
  return (
    <Button
      variant={variant}
      onClick={onClick}
      disabled={!onClick}
      className={`text-green-600 hover:text-green-800 ${className}`}
      title="Share on WhatsApp"
    >
      <MessageSquare className="h-4 w-4" />
    </Button>
  );
};

export default WhatsAppButton;