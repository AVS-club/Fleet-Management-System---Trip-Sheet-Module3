import React from 'react';
import { MessageSquare } from 'lucide-react';
import Button from '../ui/Button';

interface WhatsAppButtonProps {
  message?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'warning';
}

const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  message = "Hello from Auto Vital Solution. Driver details shared with you.",
  className,
  variant = 'outline'
}) => {
  const handleClick = () => {
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
  };
  
  return (
    <Button
      variant={variant}
      onClick={handleClick}
      disabled={!message}
      className={`text-green-600 hover:text-green-800 ${className}`}
      title="Share on WhatsApp"
    >
      <MessageSquare className="h-4 w-4" />
    </Button>
  );
};

export default WhatsAppButton;