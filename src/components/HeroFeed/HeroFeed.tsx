import React, { useState, useMemo } from 'react';
import { useHeroFeed, useKPICards } from '@/hooks/useHeroFeed';
import FeedCard from './FeedCard';
import FeedFilters from './FeedFilters';
import MediaCard from './MediaCard';
import { RefreshCw } from 'lucide-react';

export default function HeroFeed() {
  const [selectedFilters, setSelectedFilters] = useState<string[]>(['all']);
  const feedKinds = useMemo(() => {
    if (selectedFilters.includes('all')) {
      return [];
    }
    return selectedFilters.filter(kind => kind !== 'media');
  }, [selectedFilters]);

  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    isLoading, 
    refetch 
  } = useHeroFeed({
    kinds: feedKinds,
    limit: 20
  });

  const { data: kpiCards, isLoading: kpiLoading, refetch: refetchKPIs } = useKPICards();

  const events = data?.pages.flat() || [];
  
  // Combine events and media cards, interleaving them for a rich feed experience
  const combinedFeed = useMemo(() => {
    const feedItems: Array<{ type: 'event' | 'media'; data: any; timestamp: string }> = [];
    
    // Add events (filtered by selected filters)
    events.forEach(event => {
      if (selectedFilters.includes('all') || selectedFilters.includes(event.kind)) {
        feedItems.push({
          type: 'event',
          data: event,
          timestamp: event.event_time
        });
      }
    });
    
    // Add media cards (interleave every 3-4 events, but only if media filter is selected or all is selected)
    if (kpiCards && (selectedFilters.includes('all') || selectedFilters.includes('media'))) {
      kpiCards.forEach((card, index) => {
        // Insert media cards at strategic positions
        const insertPosition = Math.min(index * 3 + 2, feedItems.length);
        feedItems.splice(insertPosition, 0, {
          type: 'media',
          data: card,
          timestamp: card.computed_at
        });
      });
    }
    
    // Sort by timestamp (most recent first)
    return feedItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [events, kpiCards, selectedFilters]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fleet Activity Feed</h1>
        <button
          onClick={() => {
            refetch();
            refetchKPIs();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        {[
          { id: 'ai_alert', label: 'AI Alerts', color: 'bg-red-50 border-red-200' },
          { id: 'vehicle_doc', label: 'Documents', color: 'bg-blue-50 border-blue-200' },
          { id: 'maintenance', label: 'Maintenance', color: 'bg-indigo-50 border-indigo-200' },
          { id: 'trip', label: 'Trips', color: 'bg-green-50 border-green-200' },
          { id: 'kpi', label: 'KPIs', color: 'bg-purple-50 border-purple-200' },
          { id: 'media', label: 'Media', color: 'bg-pink-50 border-pink-200' }
        ].map(option => {
          let count = 0;
          if (option.id === 'media') {
            count = (kpiCards || [])
              .filter(card => {
                const type = card.kpi_payload?.type;
                return type === 'youtube' || type === 'image' || type === 'playlist';
              })
              .length;
          } else {
            count = events.filter(e => e.kind === option.id).length;
          }
          return (
            <div key={option.id} className={`p-4 rounded-lg border ${option.color}`}>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{count}</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">{option.label}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <FeedFilters 
        selectedFilters={selectedFilters}
        onFilterChange={setSelectedFilters}
      />

      {/* Feed */}
      <div className="mt-6 space-y-4">
        {isLoading || kpiLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading feed...</p>
          </div>
        ) : combinedFeed.length > 0 ? (
          <>
            {combinedFeed.map((item, index) => (
              <div key={`${item.type}-${item.data.id || index}`}>
                {item.type === 'event' ? (
                  <FeedCard event={item.data} onRefresh={refetch} />
                ) : (
                  <MediaCard card={item.data} />
                )}
              </div>
            ))}
            
            {hasNextPage && (
              <div className="text-center pt-4">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  {isFetchingNextPage ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600">No events to display</p>
          </div>
        )}
      </div>
    </div>
  );
}

