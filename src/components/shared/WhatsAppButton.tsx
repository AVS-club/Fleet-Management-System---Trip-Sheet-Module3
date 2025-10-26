import React from 'react';
import Button from '../ui/Button';
import WhatsAppIcon from '../ui/WhatsAppIcon';

interface WhatsAppButtonProps {
  /** Message to share. Used when no custom onClick is provided */
  message?: string;
  /** Custom handler for click events */
  onClick?: () => void;
  /** Additional button classes */
  className?: string;
  /** Button appearance variant */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'warning';
  /** Icon variant: 'light' (green), 'dark' (white), or 'auto' */
  iconVariant?: 'light' | 'dark' | 'auto';
  /** Icon size in pixels */
  iconSize?: number;
}

const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  message = 'Hello from Auto Vital Solution.',
  onClick,
  className = '',
  variant = 'outline',
  iconVariant = 'auto',
  iconSize = 20,
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (message) {
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  return (
    <Button
      variant={variant}
      onClick={handleClick}
      disabled={!message && !onClick}
      className={`text-green-600 hover:text-green-800 ${className}`}
      title="Share on WhatsApp"
    >
      <WhatsAppIcon size={iconSize} variant={iconVariant} />
    </Button>
  );
};

export default WhatsAppButton;
