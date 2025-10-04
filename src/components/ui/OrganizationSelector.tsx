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

  const sizeLayouts = {
    sm: 'h-8 px-3',
    md: 'h-9 px-3',
    lg: 'h-10 px-4'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const getAdaptiveNameSizeClass = (name: string, variant: 'sm' | 'md' | 'lg') => {
    const length = name.trim().length;

    if (variant === 'sm') {
      if (length > 30) return 'text-[10px]';
      if (length > 22) return 'text-[11px]';
      return 'text-xs';
    }

    if (variant === 'md') {
      if (length > 32) return 'text-[13px]';
      return 'text-sm';
    }

    if (length > 36) return 'text-[15px]';
    return 'text-base';
  };

  if (loading) {
    return (
      <div className={cn(
        "flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2",
        sizeLayouts[size],
        textSizes[size],
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
        sizeLayouts[size],
        textSizes[size],
        className
      )}>
        <Building2 className={cn("text-red-500", iconSizes[size])} />
        <span className="text-red-600 dark:text-red-400">No organizations</span>
      </div>
    );
  }

  if (organizations.length === 1) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border border-[#f0dca3] bg-[#fff8e6] shadow-sm transition-colors duration-200 hover:border-[#e5c768] dark:bg-[#332915] dark:border-[#a9852a]/60 dark:hover:border-[#d6b24f]/60 shrink-0",
          sizeLayouts[size],
          textSizes[size],
          className
        )}
      >
        <Building2 className={cn("text-[#c49a3a] dark:text-[#e2c46d]", iconSizes[size])} />
        <span
          className={cn(
            "text-gray-800 dark:text-gray-200 font-medium leading-tight tracking-tight whitespace-nowrap",
            getAdaptiveNameSizeClass(displayName, size)
          )}
        >
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
            sizeLayouts[size],
            textSizes[size],
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
