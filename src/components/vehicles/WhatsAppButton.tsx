import React from 'react';
import { MessageSquare } from 'lucide-react';
import Button from '../ui/Button';

interface WhatsAppButtonProps {
  phoneNumber?: string;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'warning';
}

const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  phoneNumber,
  onClick,
  className = '',
  variant = 'outline'
}) => {
  return (
    <Button
      variant={variant}
      onClick={onClick}
      disabled={!phoneNumber && !onClick}
      className={`text-green-600 hover:text-green-800 ${className}`}
      title={phoneNumber ? "Share on WhatsApp" : "No phone number available"}
    >
      <MessageSquare className="h-4 w-4" />
    </Button>
  );
};

export default WhatsAppButton;