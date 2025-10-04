import React, { useState, useRef, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { usePermissions } from '../hooks/usePermissions';
import { useHeroFeed, useKPICards } from '../hooks/useHeroFeed';
import { RefreshCw, Sparkles, Play } from 'lucide-react';

// Fleet-relevant YouTube videos
const FLEET_VIDEOS = [
  { id: 'L2ZM0j0KDr4', title: 'Truck Maintenance Tips' },
  { id: 'nUHjUoT2QwA', title: 'Fuel Saving Techniques' },
  { id: 'zWOADa2rKHo', title: 'Driver Safety Training' },
  { id: 'B1J6Ou4q8vE', title: 'Fleet GPS Tracking Guide' },
  { id: 'sFYo6-nVHd8', title: 'Commercial Vehicle Inspection' },
  { id: 'kWTozGbRrCs', title: 'Route Optimization Tips' },
  { id: 'p3jiXMXK2Cs', title: 'ELD Compliance Guide' },
  { id: 'TK5_kEBx-q4', title: 'Winter Driving Safety' }
];

const NotificationsPage: React.FC = () => {
  const { permissions, loading: permissionsLoading } = usePermissions();
  const [selectedFilters, setSelectedFilters] = useState<string[]>(['all']);
  const [playingVideos, setPlayingVideos] = useState<Set<string>>(new Set());
  const videoRefs = useRef<{ [key: string]: HTMLDivElement }>({});
  
  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    isLoading, 
    refetch 
  } = useHeroFeed({
    kinds: selectedFilters.includes('all') ? [] : selectedFilters,
    limit: 20
  });

  const { data: kpiCards } = useKPICards();

  const events = data?.pages.flat() || [];

  // Count events by type
  const getCounts = () => {
    const counts = {
      ai_alert: 0,
      vehicle_doc: 0,
      maintenance: 0,
      trip: 0,
      kpi: 0,
      vehicle_activity: 0,
      activity: 0
    };
    
    events.forEach((event: any) => {
      if (counts.hasOwnProperty(event.kind)) {
        counts[event.kind as keyof typeof counts]++;
      }
    });
    
    return counts;
  };

  const counts = getCounts();

  // Calculate media count from KPI cards
  const mediaCount = kpiCards?.filter(card => 
    card.kpi_payload?.type === 'youtube' || 
    card.kpi_payload?.type === 'image' || 
    card.kpi_payload?.type === 'playlist'
  ).length ?? 0;

  // Intersection Observer for autoplay
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const videoId = entry.target.getAttribute('data-video-id');
          if (!videoId) return;
          
          if (entry.isIntersecting) {
            setPlayingVideos(prev => new Set([...prev, videoId]));
          } else {
            setPlayingVideos(prev => {
              const newSet = new Set(prev);
              newSet.delete(videoId);
              return newSet;
            });
          }
        });
      },
      { threshold: 0.5 }
    );

    Object.values(videoRefs.current).forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [events]);

  // Handle loading and permissions after all hooks
  if (permissionsLoading) {
    return <div>Loading...</div>;
  }

  if (!permissions?.canAccessAlerts) {
    return <Navigate to="/vehicles" replace />;
  }

  const handleFilterClick = (filterId: string) => {
    if (filterId === 'all') {
      setSelectedFilters(['all']);
    } else {
      const newFilters = selectedFilters.includes(filterId)
        ? selectedFilters.filter(f => f !== filterId)
        : [...selectedFilters.filter(f => f !== 'all'), filterId];
      
      setSelectedFilters(newFilters.length === 0 ? ['all'] : newFilters);
    }
    // Force refetch when changing filters
    setTimeout(() => refetch(), 100);
  };

  // AI Summary Component
  const AISummary = ({ index }: { index: number }) => {
    const summaries = [
      "Fleet utilization improved by 12% this week. Focus on Route CG04 vehicles for maintenance scheduling.",
      "3 vehicles showing consistent route deviations. Consider driver training for efficiency improvement.",
      "Fuel costs trending upward. Recommend reviewing driver behavior reports for optimization opportunities.",
      "Document renewals clustered in Q2. Start renewal process 60 days in advance to avoid downtime."
    ];
    
    return (
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 my-6">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">AVS Intelligence Summary</h3>
            <p className="text-gray-700">{summaries[index % summaries.length]}</p>
          </div>
        </div>
      </div>
    );
  };

  // Compact KPI display
  const CompactKPIs = () => (
    <div className="grid grid-cols-5 gap-2 mb-4 opacity-75">
      {[
        { label: 'Utilization', value: '0.1%' },
        { label: 'Mileage', value: '6.8 km/L' },
        { label: 'Load/Trip', value: '3,924 kg' },
        { label: 'Cost/KM', value: '₹10.21' },
        { label: 'Distance', value: '12,450 km' }
      ].map((kpi, i) => (
        <div key={i} className="bg-white p-2 rounded text-center border border-gray-200">
          <p className="text-xs text-gray-600">{kpi.label}</p>
          <p className="text-sm font-semibold">{kpi.value}</p>
        </div>
      ))}
    </div>
  );

  // Video Reel Component
  const VideoReel = ({ videoId, index }: any) => {
    const isPlaying = playingVideos.has(videoId);
    const videoIndex = index % FLEET_VIDEOS.length;
    const video = FLEET_VIDEOS[videoIndex];
    
    return (
      <div 
        ref={el => { if (el) videoRefs.current[videoId] = el; }}
        data-video-id={videoId}
        className="relative rounded-lg overflow-hidden bg-black"
        style={{ aspectRatio: '9/16', maxHeight: '600px' }}
      >
        {isPlaying ? (
          <iframe
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${video.id}?autoplay=1&mute=1&controls=1&loop=1&playlist=${video.id}`}
            title={video.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div 
            className="relative cursor-pointer group h-full"
            onClick={() => setPlayingVideos(new Set([videoId]))}
          >
            <img
              src={`https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`}
              alt={video.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`;
              }}
            />
            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
              <div className="bg-white/90 rounded-full p-4">
                <Play className="w-8 h-8 text-black" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
              <p className="text-white font-semibold">{video.title}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderEventCard = (event: any, index: number) => {
    // Insert AI summary every 8 events (check first to avoid conflict with video reel)
    if (index > 0 && index % 8 === 0) {
      return (
        <React.Fragment key={`fragment-${event.id}`}>
          <AISummary index={index / 8} />
          {renderOriginalEventCard(event)}
        </React.Fragment>
      );
    }

    // Insert video reel every 4 events
    if (index > 0 && index % 4 === 0) {
      return (
        <React.Fragment key={`fragment-${event.id}`}>
          <VideoReel 
            videoId={`video-${index}`} 
            index={index}
          />
          {renderOriginalEventCard(event)}
        </React.Fragment>
      );
    }

    return renderOriginalEventCard(event);
  };

  const renderOriginalEventCard = (event: any) => {
    // Your existing event card rendering logic here
    const getPriorityStyles = (priority: string) => {
      switch (priority) {
        case 'danger': return 'border-red-200 bg-red-50';
        case 'warn': return 'border-yellow-200 bg-yellow-50';
        default: return 'border-gray-200 bg-white';
      }
    };

    return (
      <div key={event.id} className={`p-4 rounded-lg border ${getPriorityStyles(event.priority)}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{event.title}</h3>
            <p className="text-sm text-gray-600 mt-1">{event.description}</p>
            <p className="text-xs text-gray-500 mt-2">
              {new Date(event.event_time).toLocaleString()}
            </p>
          </div>
          {event.kind === 'vehicle_doc' && (
            <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
              Send Reminder
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Compact KPIs */}
        <CompactKPIs />
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Fleet Activity Feed</h1>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Stats Grid - Updated to show real counts */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
          <div className="bg-white p-3 rounded-lg border">
            <span className="text-lg font-bold">{counts.ai_alert}</span>
            <p className="text-xs text-gray-600">AI Alerts</p>
          </div>
          <div className="bg-white p-3 rounded-lg border">
            <span className="text-lg font-bold">{counts.vehicle_doc}</span>
            <p className="text-xs text-gray-600">Documents</p>
          </div>
          <div className="bg-white p-3 rounded-lg border">
            <span className="text-lg font-bold">{counts.maintenance}</span>
            <p className="text-xs text-gray-600">Maintenance</p>
          </div>
          <div className="bg-white p-3 rounded-lg border">
            <span className="text-lg font-bold">{counts.trip}</span>
            <p className="text-xs text-gray-600">Trips</p>
          </div>
          <div className="bg-white p-3 rounded-lg border">
            <span className="text-lg font-bold">{counts.kpi}</span>
            <p className="text-xs text-gray-600">KPIs</p>
          </div>
          <div className="bg-white p-3 rounded-lg border">
            <span className="text-lg font-bold">{mediaCount}</span>
            <p className="text-xs text-gray-600">Media</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'ai_alert', 'vehicle_doc', 'maintenance', 'trip', 'kpi', 'media'].map(filter => (
            <button
              key={filter}
              onClick={() => handleFilterClick(filter)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedFilters.includes(filter)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter === 'all' ? 'All' : filter.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </button>
          ))}
        </div>

        {/* Feed with mixed content */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading feed...</p>
            </div>
          ) : events.length > 0 ? (
            <>
              {events.map((event, index) => renderEventCard(event, index))}
              
              {hasNextPage && (
                <div className="text-center pt-4">
                  <button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
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
    </Layout>
  );
};

export default NotificationsPage;