import React, { useState } from 'react';
import { Lightbulb, X } from 'lucide-react';

interface DashboardTipProps {
  title: string;
  content: string;
  link?: {
    text: string;
    url: string;
  };
}

const DashboardTip: React.FC<DashboardTipProps> = ({ title, content, link }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4 relative">
      <button 
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        aria-label="Dismiss tip"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="flex items-start">
        <div className="flex-shrink-0 mt-0.5">
          <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 dark:text-blue-400" />
        </div>
        <div className="ml-2 sm:ml-3">
          <h3 className="text-xs sm:text-sm font-medium text-blue-800 dark:text-blue-300">{title}</h3>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-blue-700 dark:text-blue-400">{content}</p>
          {link && (
            <a 
              href={link.url}
              className="mt-1 sm:mt-2 inline-block text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-300 hover:underline"
            >
              {link.text}
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardTip;