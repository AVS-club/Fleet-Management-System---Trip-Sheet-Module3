import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import MediaCard from '../components/HeroFeed/MediaCard';
import { usePermissions } from '../hooks/usePermissions';
import { useHeroFeed, useKPICards } from '../hooks/useHeroFeed';
import LoadingScreen from '../components/LoadingScreen';
import { RefreshCw, Sparkles, Play, Volume2, VolumeX, Heart, MessageCircle, Share2, Video, VideoOff } from 'lucide-react';
import { useYouTubeShorts, YouTubeShort } from '../hooks/useYouTubeShorts';

// Dynamic YouTube shorts are now fetched from the API

const NotificationsPage: React.FC = () => {
  const { permissions, loading: permissionsLoading } = usePermissions();
  const [selectedFilters, setSelectedFilters] = useState<string[]>(['all']);

  // Video toggle state with localStorage persistence
  const [showVideos, setShowVideos] = useState(() => {
    const saved = localStorage.getItem('showVideos');
    return saved !== null ? JSON.parse(saved) : false; // DEFAULT OFF
  });

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

  const { data: kpiCards, refetch: refetchKPIs } = useKPICards();

  // Check if YouTube API key is available
  const hasYouTubeAPIKey = !!import.meta.env.VITE_YOUTUBE_API_KEY;

  // Fetch dynamic YouTube shorts only if API key is available
  const {
    data: youtubeShorts,
    isLoading: shortsLoading,
    refetch: refetchShorts
  } = useYouTubeShorts({
    count: 20,
    enabled: hasYouTubeAPIKey // Only fetch if API key is available
  });

  // Use YouTube shorts if available, fallback to empty array
  const availableShorts = youtubeShorts || [];

  const events = useMemo(() => (data?.pages ?? []).flat(), [data]);

  const counts = useMemo(() => {
    const result = {
      ai_alert: 0,
      vehicle_doc: 0,
      maintenance: 0,
      trip: 0,
      kpi: 0,
      vehicle_activity: 0,
      activity: 0,
    };

    events.forEach((event: any) => {
      if (Object.prototype.hasOwnProperty.call(result, event.kind)) {
        result[event.kind as keyof typeof result]++;
      }
    });

    return result;
  }, [events]);

  const mediaCards = useMemo(() => {
    if (!kpiCards) {
      return [];
    }
    return kpiCards.filter(card => {
      const type = card.kpi_payload?.type;
      return type === 'youtube' || type === 'image' || type === 'playlist';
    });
  }, [kpiCards]);

  const mediaCount = mediaCards.length;
  const isMediaOnly = selectedFilters.length === 1 && selectedFilters[0] === 'media';

  const filteredEvents = useMemo(() => {
    if (isMediaOnly) {
      return [];
    }
    if (feedKinds.length === 0) {
      return events;
    }
    return events.filter((event: any) => feedKinds.includes(event.kind));
  }, [events, feedKinds, isMediaOnly]);


  // Handle loading and permissions after all hooks
  if (permissionsLoading) {
    return <LoadingScreen isLoading={true} />;
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
    setTimeout(() => {
      refetch();
      refetchKPIs();
    }, 100);
  };

  // Toggle video visibility
  const toggleVideos = () => {
    const newValue = !showVideos;
    setShowVideos(newValue);
    localStorage.setItem('showVideos', JSON.stringify(newValue));
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
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6 my-6">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-1" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">AVS Intelligence Summary</h3>
            <p className="text-gray-700 dark:text-gray-300">{summaries[index % summaries.length]}</p>
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
        { label: 'Cost/KM', value: 'Rs 10.21' },
        { label: 'Distance', value: '12,450 km' }
      ].map((kpi, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 p-2 rounded text-center border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400">{kpi.label}</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{kpi.value}</p>
        </div>
      ))}
    </div>
  );

  // Inline Reel Card Component
  interface InlineReelCardProps {
    videoId: string;
    index: number;
    short?: YouTubeShort; // Optional short data
  }

  const InlineReelCard: React.FC<InlineReelCardProps> = ({ videoId, index, short: providedShort }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [liked, setLiked] = useState(false);
    const videoRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    // Use provided short or get from availableShorts
    const short = providedShort || availableShorts[index % availableShorts.length];

    // If no short available, show appropriate state
    if (!short) {
      return (
        <div className="w-full max-w-2xl mx-auto rounded-xl overflow-hidden bg-gray-900 shadow-2xl my-6"
             style={{ aspectRatio: '9/16', maxHeight: '650px' }}>
          <div className="flex items-center justify-center h-full">
            <div className="text-white text-center p-6">
              {!hasYouTubeAPIKey ? (
                <div>
                  <div className="text-4xl mb-4">🎬</div>
                  <div className="text-lg font-semibold mb-2">YouTube API Key Required</div>
                  <div className="text-sm text-gray-300">
                    Add VITE_YOUTUBE_API_KEY to .env file to enable dynamic video content
                  </div>
                </div>
              ) : (
                <div>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <div>Loading videos...</div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Intersection Observer for autoplay
    useEffect(() => {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
              setIsPlaying(true);
            } else if (entry.intersectionRatio < 0.4) {
              setIsPlaying(false);
            }
          });
        },
        {
          threshold: [0, 0.4, 0.6, 1],
          rootMargin: '0px'
        }
      );

      if (videoRef.current) {
        observerRef.current.observe(videoRef.current);
      }

      return () => {
        if (observerRef.current) {
          observerRef.current.disconnect();
        }
      };
    }, []);

    const toggleMute = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsMuted(!isMuted);
    };

    const togglePlay = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsPlaying(!isPlaying);
    };

    const handleLike = (e: React.MouseEvent) => {
      e.stopPropagation();
      setLiked(!liked);
    };

    return (
      <div
        ref={videoRef}
        data-video-id={videoId}
        className="relative w-full max-w-2xl mx-auto rounded-xl overflow-hidden bg-black shadow-2xl my-6"
        style={{ aspectRatio: '9/16', maxHeight: '650px' }}
      >
        <div className="relative w-full h-full">
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${short.id}?${
              isPlaying ? 'autoplay=1' : 'autoplay=0'
            }&mute=${isMuted ? 1 : 0}&controls=0&loop=1&playlist=${short.id}&playsinline=1&modestbranding=1&rel=0&fs=0&disablekb=1`}
            title={short.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />

          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none">

            <div className="absolute top-0 left-0 right-0 p-4 pointer-events-auto">
              <div className="flex items-center justify-between">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-2">
                  <span className="text-lg">🎬</span>
                  AVS Fleet Tips
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={toggleMute}
                    className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-all active:scale-95"
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                <button
                  onClick={togglePlay}
                  className="w-20 h-20 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center hover:bg-white/40 transition-all hover:scale-110 active:scale-95"
                >
                  <Play className="w-10 h-10 text-white ml-1" fill="white" />
                </button>
              </div>
            )}

            {isPlaying && (
              <div className="absolute top-4 left-4 flex gap-1 pointer-events-none">
                <div className="w-1 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms', animationDuration: '0.8s' }} />
                <div className="w-1 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms', animationDuration: '0.8s' }} />
                <div className="w-1 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms', animationDuration: '0.8s' }} />
              </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 p-4 pb-6 pointer-events-auto">
              <div className="flex items-end justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-lg mb-1 drop-shadow-lg line-clamp-2">
                    {short.title}
                  </h3>
                  <p className="text-white/90 text-sm mb-3 drop-shadow-lg line-clamp-2">
                    {short.description.substring(0, 100)}...
                  </p>
                  <div className="flex items-center gap-4 text-white/80 text-sm">
                    <span className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      {short.viewCount || short.likeCount || '0'}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" />
                      {short.channelTitle}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-4 items-center flex-shrink-0">
                  <button
                    onClick={handleLike}
                    className={`flex flex-col items-center gap-1 transition-all ${
                      liked ? 'text-red-500' : 'text-white hover:text-red-400'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full backdrop-blur-sm flex items-center justify-center transition-all ${
                      liked ? 'bg-red-500/30 scale-110' : 'bg-white/20 hover:bg-white/30'
                    }`}>
                      <Heart className={`w-6 h-6 ${liked ? 'fill-current' : ''}`} />
                    </div>
                    <span className="text-xs font-medium drop-shadow">{short.viewCount || '0'}</span>
                  </button>

                  <button className="flex flex-col items-center gap-1 text-white hover:text-blue-400 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all">
                      <MessageCircle className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-medium drop-shadow">{short.likeCount || '0'}</span>
                  </button>

                  <button className="flex flex-col items-center gap-1 text-white hover:text-green-400 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all">
                      <Share2 className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-medium drop-shadow">Share</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute -inset-px bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-xl opacity-20 blur-md -z-10" />
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

    // Insert video reel every 5 events - ONLY IF showVideos is true
    if (showVideos && index > 0 && index % 5 === 0 && index % 8 !== 0) {
      const shortIndex = Math.floor(index / 5) % (availableShorts.length || 1);
      const short = availableShorts[shortIndex];

      return (
        <React.Fragment key={`fragment-${event.id}`}>
          <InlineReelCard
            videoId={`video-${index}`}
            index={shortIndex}
            short={short}
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
        case 'danger': return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20';
        case 'warn': return 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20';
        default: return 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800';
      }
    };

    return (
      <div key={event.id} className={`p-4 rounded-lg border ${getPriorityStyles(event.priority)}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{event.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{event.description}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              {new Date(event.event_time).toLocaleString()}
            </p>
          </div>
          {event.kind === 'vehicle_doc' && (
            <button className="px-3 py-1 bg-blue-600 dark:bg-blue-500 text-white rounded text-sm hover:bg-blue-700 dark:hover:bg-blue-600">
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Fleet Activity Feed</h1>
          <div className="flex items-center gap-3">
            {/* Video Toggle Button */}
            <button
              onClick={toggleVideos}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                showVideos
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md hover:shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              title={showVideos ? 'Hide video reels' : 'Show video reels'}
            >
              {showVideos ? (
                <>
                  <Video className="w-4 h-4" />
                  <span className="text-sm font-medium">Videos ON</span>
                </>
              ) : (
                <>
                  <VideoOff className="w-4 h-4" />
                  <span className="text-sm font-medium">Videos OFF</span>
                </>
              )}
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Grid - Updated to show real counts */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{counts.ai_alert}</span>
            <p className="text-xs text-gray-600 dark:text-gray-400">AI Alerts</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{counts.vehicle_doc}</span>
            <p className="text-xs text-gray-600 dark:text-gray-400">Documents</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{counts.maintenance}</span>
            <p className="text-xs text-gray-600 dark:text-gray-400">Maintenance</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{counts.trip}</span>
            <p className="text-xs text-gray-600 dark:text-gray-400">Trips</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{counts.kpi}</span>
            <p className="text-xs text-gray-600 dark:text-gray-400">KPIs</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{mediaCount}</span>
            <p className="text-xs text-gray-600 dark:text-gray-400">Media</p>
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
                  ? 'bg-blue-600 dark:bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
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
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading feed...</p>
            </div>
          ) : isMediaOnly ? (
            mediaCards.length > 0 || availableShorts.length > 0 ? (
              <div className="space-y-4">
                {mediaCards.map((card, index) => (
                  <MediaCard key={`media-card-${card.id ?? index}`} card={card} />
                ))}
                {availableShorts.map((short, index) => (
                  <InlineReelCard
                    key={`media-reel-${short.id}`}
                    videoId={`media-${short.id}`}
                    index={index}
                    short={short}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-gray-600 dark:text-gray-400">No media to display</p>
              </div>
            )
          ) : filteredEvents.length > 0 ? (
            <>
              {filteredEvents.map((event, index) => renderEventCard(event, index))}

              {hasNextPage && (
                <div className="text-center pt-4">
                  <button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="px-6 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    {isFetchingNextPage ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-gray-600 dark:text-gray-400">No events to display</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default NotificationsPage;

