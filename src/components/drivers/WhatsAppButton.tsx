import React from 'react';
import { MessageSquare } from 'lucide-react';
import Button from '../ui/Button';

interface WhatsAppButtonProps {
  phoneNumber?: string;
  message?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'warning';
}

const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  phoneNumber,
  message = "Hello from Auto Vital Solution. Driver details shared with you.",
  className,
  variant = 'outline'
}) => {
  // Format phone number - remove spaces, dashes, brackets, etc.
  const formatPhoneNumber = (phone: string) => {
    // Remove all non-numeric characters
    let formattedNumber = phone.replace(/\D/g, '');
    
    // If the number doesn't start with a country code, add India's code (+91)
    if (!formattedNumber.startsWith('91') && formattedNumber.length === 10) {
      formattedNumber = '91' + formattedNumber;
    }
    
    return formattedNumber;
  };
  
  const handleClick = () => {
    if (!phoneNumber) return;
    
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  };
  
  return (
    <Button
      variant={variant}
      onClick={handleClick}
      disabled={!phoneNumber}
      className={className}
      icon={<MessageSquare className="h-4 w-4" />}
      title={phoneNumber ? "Share on WhatsApp" : "No phone number available"}
    >
      WhatsApp
    </Button>
  );
};

export default WhatsAppButton;