import React, { useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Building2, ChevronDown, X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface MobileOrganizationSelectorProps {
  className?: string;
}

const MobileOrganizationSelector: React.FC<MobileOrganizationSelectorProps> = ({ 
  className 
}) => {
  const { 
    currentOrganizationId, 
    organizations, 
    setCurrentOrganization, 
    loading 
  } = useOrganization();
  const { permissions } = usePermissions();

  const [isOpen, setIsOpen] = useState(false);
  const currentOrg = organizations.find(org => org.id === currentOrganizationId);
  
  // Use organization name from permissions if available
  const displayName = permissions?.organizationName || currentOrg?.name || 'Unknown Organization';

  if (loading) {
    return (
      <div className={cn(
        "flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2",
        className
      )}>
        <Building2 className="h-4 w-4 text-gray-400 animate-pulse" />
        <span className="text-gray-500 dark:text-gray-400 text-sm">Loading...</span>
      </div>
    );
  }

  if (organizations.length === 0) {
    // Still show organization name from permissions if available
    if (permissions?.organizationName) {
      return (
        <div className={cn(
          "flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2",
          className
        )}>
          <Building2 className="h-4 w-4 text-primary-600" />
          <span className="text-gray-900 dark:text-gray-100 text-sm font-medium">
            {permissions.organizationName}
          </span>
        </div>
      );
    }
    
    // Only show error if BOTH organizations and permissions are empty
    return (
      <div className={cn(
        "flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 px-3 py-2",
        className
      )}>
        <Building2 className="h-4 w-4 text-red-500" />
        <span className="text-red-600 dark:text-red-400 text-sm">No organizations</span>
      </div>
    );
  }

  if (organizations.length === 1) {
    return (
      <div className={cn(
        "flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2",
        className
      )}>
        <Building2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        <span className="text-gray-700 dark:text-gray-300 font-medium text-sm">
          {displayName}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 w-full"
      >
        <Building2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        <span className="flex-1 text-left truncate">
          {displayName}
        </span>
        <ChevronDown className={cn(
          "h-4 w-4 text-gray-400 transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => {
                  setCurrentOrganization(org.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
                  currentOrganizationId === org.id && "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                )}
              >
                <Building2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <div className="flex-1">
                  <div className="font-medium">{org.name}</div>
                  {org.role && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {org.role}
                    </div>
                  )}
                </div>
                {currentOrganizationId === org.id && (
                  <div className="w-2 h-2 bg-primary-600 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default MobileOrganizationSelector;
