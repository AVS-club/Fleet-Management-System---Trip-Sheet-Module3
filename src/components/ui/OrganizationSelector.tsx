import React from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Building2, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface OrganizationSelectorProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({ 
  className, 
  showLabel = true,
  size = 'md'
}) => {
  const { 
    currentOrganizationId, 
    organizations, 
    setCurrentOrganization, 
    loading 
  } = useOrganization();
  const { permissions } = usePermissions();

  const currentOrg = organizations.find(org => org.id === currentOrganizationId);
  
  // Use organization name from permissions if available
  const displayName = permissions?.organizationName || currentOrg?.name || 'Unknown Organization';

  const sizeClasses = {
    sm: 'h-8 px-2 text-xs',
    md: 'h-9 px-3 text-sm',
    lg: 'h-10 px-4 text-base'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  if (loading) {
    return (
      <div className={cn(
        "flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2",
        sizeClasses[size],
        className
      )}>
        <Loader2 className={cn("animate-spin text-gray-400", iconSizes[size])} />
        <span className="text-gray-500 dark:text-gray-400">Loading...</span>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className={cn(
        "flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 px-3 py-2",
        sizeClasses[size],
        className
      )}>
        <Building2 className={cn("text-red-500", iconSizes[size])} />
        <span className="text-red-600 dark:text-red-400">No organizations</span>
      </div>
    );
  }

  if (organizations.length === 1) {
    return (
      <div className={cn(
        "flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2",
        sizeClasses[size],
        className
      )}>
        <Building2 className={cn("text-gray-500 dark:text-gray-400", iconSizes[size])} />
        <span className="text-gray-700 dark:text-gray-300 font-medium">
          {displayName}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {showLabel && (
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Organization
        </label>
      )}
      <div className="relative">
        <select
          value={currentOrganizationId || ''}
          onChange={(e) => setCurrentOrganization(e.target.value)}
          className={cn(
            "appearance-none flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
            sizeClasses[size],
            "pr-8"
          )}
          aria-label="Select organization"
        >
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDown className={cn("text-gray-400", iconSizes[size])} />
        </div>
      </div>
    </div>
  );
};

export default OrganizationSelector;
