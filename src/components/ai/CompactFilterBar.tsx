import React, { useState } from 'react';
import { 
  Sparkles, FileText, Wrench, Route, TrendingUp, 
  Video, VideoOff, Filter, ChevronDown, ChevronUp
} from 'lucide-react';

interface CompactFilterBarProps {
  selectedFilters: string[];
  setSelectedFilters: (filters: string[]) => void;
  showVideos: boolean;
  toggleVideos: () => void;
  showDemoInsights: boolean;
  setShowDemoInsights: (show: boolean) => void;
  includeDocuments: boolean;
  setIncludeDocuments: (include: boolean) => void;
  showFutureEvents: boolean;
  setShowFutureEvents: (show: boolean) => void;
  eventCounts: {
    ai_alert: number;
    vehicle_doc: number;
    maintenance: number;
    trip: number;
    kpi: number;
    videos: number;
    concepts: number;
  };
}

const CompactFilterBar: React.FC<CompactFilterBarProps> = ({
  selectedFilters,
  setSelectedFilters,
  showVideos,
  toggleVideos,
  showDemoInsights,
  setShowDemoInsights,
  includeDocuments,
  setIncludeDocuments,
  showFutureEvents,
  setShowFutureEvents,
  eventCounts
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleFilter = (filter: string) => {
    if (!selectedFilters.includes(filter)) {
      setSelectedFilters(
        selectedFilters.includes('all') 
          ? [filter] 
          : [...selectedFilters, filter]
      );
    } else {
      setSelectedFilters(selectedFilters.filter(f => f !== filter));
    }
  };

  const filters = [
    { id: 'ai_alert', label: 'AI', icon: Sparkles, count: eventCounts.ai_alert, color: 'purple' },
    { id: 'vehicle_doc', label: 'Docs', icon: FileText, count: eventCounts.vehicle_doc, color: 'blue' },
    { id: 'maintenance', label: 'Maint', icon: Wrench, count: eventCounts.maintenance, color: 'orange' },
    { id: 'trip', label: 'Trips', icon: Route, count: eventCounts.trip, color: 'green' },
    { id: 'kpi', label: 'KPIs', icon: TrendingUp, count: eventCounts.kpi, color: 'indigo' },
  ];

  const getFilterStyles = (color: string, isActive: boolean) => {
    const styles = {
      purple: isActive ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-gray-50 text-gray-600 border-gray-200',
      blue: isActive ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-200',
      orange: isActive ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-gray-50 text-gray-600 border-gray-200',
      green: isActive ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200',
      indigo: isActive ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-600 border-gray-200',
      pink: isActive ? 'bg-pink-100 text-pink-700 border-pink-200' : 'bg-gray-50 text-gray-600 border-gray-200',
      teal: isActive ? 'bg-teal-100 text-teal-700 border-teal-200' : 'bg-gray-50 text-gray-600 border-gray-200',
    };
    return styles[color as keyof typeof styles] || styles.purple;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Main Filter Row - Always Visible */}
      <div className="p-2 sm:p-3">
        {/* Mobile: 2 rows of 3 filters each */}
        <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-1.5 sm:gap-2">
          {filters.map((filter) => {
            const Icon = filter.icon;
            const isActive = selectedFilters.includes(filter.id) || selectedFilters.includes('all');
            
            return (
              <button
                key={filter.id}
                onClick={() => toggleFilter(filter.id)}
                className={`
                  flex items-center justify-center gap-1 px-2 py-1.5 sm:px-2.5 sm:py-1.5
                  rounded-full text-xs font-medium transition-all border
                  ${getFilterStyles(filter.color, isActive)}
                  ${isActive ? 'shadow-sm' : 'hover:bg-gray-100'}
                `}
              >
                <Icon className="w-3 h-3 flex-shrink-0" />
                <span className="hidden xs:inline">{filter.label}</span>
                {filter.count > 0 && (
                  <span className={`
                    ml-0.5 px-1 py-0.5 rounded-full text-[10px] font-semibold
                    ${isActive ? 'bg-white/60' : 'bg-white'}
                  `}>
                    {filter.count > 99 ? '99+' : filter.count}
                  </span>
                )}
              </button>
            );
          })}

          {/* Video Toggle */}
          <button
            onClick={toggleVideos}
            className={`
              flex items-center justify-center gap-1 px-2 py-1.5 sm:px-2.5 sm:py-1.5
              rounded-full text-xs font-medium transition-all border
              ${getFilterStyles('pink', showVideos)}
              ${showVideos ? 'shadow-sm' : 'hover:bg-gray-100'}
            `}
          >
            {showVideos ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
            <span className="hidden xs:inline">Videos</span>
            {eventCounts.videos > 0 && (
              <span className={`
                ml-0.5 px-1 py-0.5 rounded-full text-[10px] font-semibold
                ${showVideos ? 'bg-white/60' : 'bg-white'}
              `}>
                {eventCounts.videos}
              </span>
            )}
          </button>

          {/* Concepts Toggle */}
          <button
            onClick={() => {
              const newValue = !showDemoInsights;
              setShowDemoInsights(newValue);
              localStorage.setItem('showDemoInsights', JSON.stringify(newValue));
            }}
            className={`
              flex items-center justify-center gap-1 px-2 py-1.5 sm:px-2.5 sm:py-1.5
              rounded-full text-xs font-medium transition-all border
              ${getFilterStyles('teal', showDemoInsights)}
              ${showDemoInsights ? 'shadow-sm' : 'hover:bg-gray-100'}
            `}
          >
            <Sparkles className="w-3 h-3" />
            <span className="hidden xs:inline">AI</span>
            {showDemoInsights && eventCounts.concepts > 0 && (
              <span className={`
                ml-0.5 px-1 py-0.5 rounded-full text-[10px] font-semibold
                ${showDemoInsights ? 'bg-white/60' : 'bg-white'}
              `}>
                {eventCounts.concepts}
              </span>
            )}
          </button>
        </div>

        {/* Expand/Collapse Toggle for Additional Options */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 w-full flex items-center justify-center gap-1 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors sm:hidden"
        >
          <Filter className="w-3 h-3" />
          <span>More Options</span>
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Additional Options - Collapsible on Mobile */}
      <div className={`
        border-t border-gray-100 px-3 transition-all duration-300 overflow-hidden
        ${isExpanded ? 'py-3 max-h-32' : 'sm:py-3 max-h-0 sm:max-h-32'}
      `}>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
          {/* Document Reminders Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeDocuments}
              onChange={(e) => setIncludeDocuments(e.target.checked)}
              className="sr-only"
            />
            <div className={`
              relative w-9 h-5 rounded-full transition-colors duration-200
              ${includeDocuments ? 'bg-teal-500' : 'bg-gray-300'}
            `}>
              <div className={`
                absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200
                ${includeDocuments ? 'translate-x-4' : 'translate-x-0'}
              `}></div>
            </div>
            <span className="text-xs text-gray-700">Doc Reminders</span>
          </label>

          {/* Future Events Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showFutureEvents}
              onChange={(e) => {
                const newValue = e.target.checked;
                setShowFutureEvents(newValue);
                localStorage.setItem('showFutureEvents', JSON.stringify(newValue));
              }}
              className="sr-only"
            />
            <div className={`
              relative w-9 h-5 rounded-full transition-colors duration-200
              ${showFutureEvents ? 'bg-teal-500' : 'bg-gray-300'}
            `}>
              <div className={`
                absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200
                ${showFutureEvents ? 'translate-x-4' : 'translate-x-0'}
              `}></div>
            </div>
            <span className="text-xs text-gray-700">Future Events</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default CompactFilterBar;
