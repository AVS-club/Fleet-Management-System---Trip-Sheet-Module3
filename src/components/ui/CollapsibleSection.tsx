import React, { useState, ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "../../utils/cn";

interface CollapsibleSectionProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  defaultExpanded?: boolean;
  iconColor?: string;
  headerBgClass?: string; // New prop for custom header background
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  children,
  defaultExpanded = false,
  iconColor = "text-primary-600",
  headerBgClass = "bg-white dark:bg-gray-900", // Default background with dark mode support
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg mb-6">
      <button
        type="button"
        className={cn(
          "w-full flex items-center justify-between p-4 hover:bg-opacity-90 transition-colors duration-200",
          headerBgClass
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          {icon && <div className={cn("mr-3", iconColor)}>{icon}</div>}
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{title}</h3>
        </div>
        <div className="text-gray-500 dark:text-gray-400">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </div>
      </button>

      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          isExpanded
            ? "max-h-[2000px] opacity-100 overflow-visible"
            : "max-h-0 opacity-0 overflow-hidden"
        )}
      >
        <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          {children}
        </div>
      </div>
    </div>
  );
};

export default CollapsibleSection;

