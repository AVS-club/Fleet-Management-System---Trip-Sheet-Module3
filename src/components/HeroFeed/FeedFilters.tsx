import React from 'react';

interface FeedFiltersProps {
  selectedFilters: string[];
  onFilterChange: (filters: string[]) => void;
}

const filterOptions = [
  { id: 'all', label: 'All', color: 'bg-gray-100' },
  { id: 'ai_alert', label: 'AI Alerts', color: 'bg-red-100' },
  { id: 'vehicle_doc', label: 'Documents', color: 'bg-blue-100' },
  { id: 'maintenance', label: 'Maintenance', color: 'bg-indigo-100' },
  { id: 'trip', label: 'Trips', color: 'bg-green-100' },
  { id: 'kpi', label: 'KPIs', color: 'bg-purple-100' },
  { id: 'media', label: 'Media', color: 'bg-pink-100' },
];

export default function FeedFilters({ selectedFilters, onFilterChange }: FeedFiltersProps) {
  const handleFilterClick = (filterId: string) => {
    if (filterId === 'all') {
      onFilterChange(['all']);
    } else {
      const newFilters = selectedFilters.includes(filterId)
        ? selectedFilters.filter(f => f !== filterId)
        : [...selectedFilters.filter(f => f !== 'all'), filterId];
      
      onFilterChange(newFilters.length === 0 ? ['all'] : newFilters);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {filterOptions.map(option => (
        <button
          key={option.id}
          onClick={() => handleFilterClick(option.id)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selectedFilters.includes(option.id)
              ? 'bg-blue-600 text-white'
              : `${option.color} text-gray-700 hover:bg-gray-200`
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
