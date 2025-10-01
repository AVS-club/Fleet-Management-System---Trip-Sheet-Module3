import React from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import OrganizationSelector from '@/components/ui/OrganizationSelector';
import MobileOrganizationSelector from '@/components/ui/MobileOrganizationSelector';

/**
 * Example component showing how to use the OrganizationContext
 * This file can be deleted after you understand the usage patterns
 */
const OrganizationUsageExample: React.FC = () => {
  const { 
    currentOrganizationId, 
    organizations, 
    setCurrentOrganization, 
    loading 
  } = useOrganization();

  if (loading) {
    return <div>Loading organizations...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Organization Context Usage Examples</h2>
      
      {/* Example 1: Basic organization info */}
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Current Organization Info:</h3>
        <p>Current Organization ID: {currentOrganizationId || 'None selected'}</p>
        <p>Total Organizations: {organizations.length}</p>
        <p>Available Organizations: {organizations.map(org => org.name).join(', ')}</p>
      </div>

      {/* Example 2: Desktop Organization Selector */}
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Desktop Organization Selector:</h3>
        <OrganizationSelector showLabel={true} size="md" />
      </div>

      {/* Example 3: Mobile Organization Selector */}
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Mobile Organization Selector:</h3>
        <MobileOrganizationSelector />
      </div>

      {/* Example 4: Programmatic organization switching */}
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Programmatic Organization Switching:</h3>
        <div className="flex gap-2 flex-wrap">
          {organizations.map((org) => (
            <button
              key={org.id}
              onClick={() => setCurrentOrganization(org.id)}
              className={`px-3 py-1 rounded text-sm ${
                currentOrganizationId === org.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {org.name}
            </button>
          ))}
        </div>
      </div>

      {/* Example 5: Conditional rendering based on organization */}
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Conditional Content:</h3>
        {currentOrganizationId ? (
          <p className="text-green-600 dark:text-green-400">
            ✅ Organization selected: {organizations.find(org => org.id === currentOrganizationId)?.name}
          </p>
        ) : (
          <p className="text-red-600 dark:text-red-400">
            ❌ No organization selected
          </p>
        )}
      </div>
    </div>
  );
};

export default OrganizationUsageExample;
