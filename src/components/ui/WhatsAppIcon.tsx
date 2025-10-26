import React, { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';

interface WhatsAppIconProps {
  /** Size in pixels (default: 20) */
  size?: number;
  /** Additional CSS classes */
  className?: string;
  /** Force variant: 'light' (green), 'dark' (white/inverted), or 'auto' (default) */
  variant?: 'light' | 'dark' | 'auto';
}

/**
 * WhatsApp Icon Component
 * Automatically displays the correct WhatsApp logo based on context
 * - Light backgrounds: Green WhatsApp logo (whatsapp-light.png)
 * - Dark/Green buttons: White WhatsApp logo (whatsapp-dark.png)
 * Falls back to MessageCircle icon if images fail to load
 */
const WhatsAppIcon: React.FC<WhatsAppIconProps> = ({
  size = 20,
  className = '',
  variant = 'auto'
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (variant !== 'auto') return; // Skip if variant is manually set

    // Check if dark mode is enabled
    const checkDarkMode = () => {
      const htmlElement = document.documentElement;
      const hasDarkClass = htmlElement.classList.contains('dark');
      setIsDarkMode(hasDarkClass);
    };

    // Initial check
    checkDarkMode();

    // Listen for manual theme changes (when Tailwind's `dark` class toggles)
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => {
      observer.disconnect();
    };
  }, [variant]);

  // If image fails to load, show fallback icon
  if (imageError) {
    return <MessageCircle className={className} style={{ width: size, height: size }} />;
  }

  // Determine which icon to use
  let iconSrc: string;
  if (variant === 'light') {
    // Force green logo
    iconSrc = '/assets/icons/whatsapp-light.png';
  } else if (variant === 'dark') {
    // Force white/inverted logo
    iconSrc = '/assets/icons/whatsapp-dark.png';
  } else {
    // Auto mode: use dark logo for dark mode, light logo for light mode
    iconSrc = isDarkMode
      ? '/assets/icons/whatsapp-dark.png'
      : '/assets/icons/whatsapp-light.png';
  }

  return (
    <img
      src={iconSrc}
      alt="WhatsApp"
      className={className}
      style={{
        width: size,
        height: size,
        display: 'inline-block',
        verticalAlign: 'middle',
        objectFit: 'contain',
        flexShrink: 0
      }}
      onError={() => setImageError(true)}
    />
  );
};

export default WhatsAppIcon;

