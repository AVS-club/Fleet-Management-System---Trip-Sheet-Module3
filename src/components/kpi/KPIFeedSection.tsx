import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { KPICard as KPICardType } from '../../hooks/useKPICards';
import EnhancedKPICard from './EnhancedKPICard';
import { getGroupInfo } from '../../utils/kpiInsights';

interface KPIFeedSectionProps {
  groupKey: string;
  kpis: KPICardType[];
  defaultExpanded?: boolean;
}

const KPIFeedSection: React.FC<KPIFeedSectionProps> = ({ 
  groupKey, 
  kpis,
  defaultExpanded = true 
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const groupInfo = getGroupInfo(groupKey);

  if (kpis.length === 0) return null;

  return (
    <div className="mb-6">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full px-4 py-3 mb-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl hover:shadow-md transition-all group"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{groupInfo.icon}</span>
          <div className="text-left">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {groupInfo.title}
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {groupInfo.description} · {kpis.length} {kpis.length === 1 ? 'metric' : 'metrics'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-sm font-semibold text-gray-700 dark:text-gray-300 shadow-sm">
            {kpis.length}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors" />
          )}
        </div>
      </button>

      {/* KPI Cards */}
      {isExpanded && (
        <div className="space-y-4 animate-fadeIn">
          {kpis.map((kpi, index) => (
            <div 
              key={kpi.id} 
              className="animate-slideInUp"
              style={{ 
                animationDelay: `${index * 50}ms`,
                animationFillMode: 'both'
              }}
            >
              <EnhancedKPICard 
                kpi={kpi} 
                variant="full" 
                index={index}
                showInsights={true}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default KPIFeedSection;

