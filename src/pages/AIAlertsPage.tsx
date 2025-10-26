import React, { useState, useEffect, useMemo, useRef } from 'react';
import Layout from '../components/layout/Layout';
import { AIAlert } from '@/types';
import { getAIAlerts, processAlertAction, runAlertScan } from '../utils/aiAnalytics';
import { getVehicle, getVehicles } from '../utils/storage';
import DriverAIInsights from '../components/ai/DriverAIInsights';
import MediaCard from '../components/HeroFeed/MediaCard';
import EnhancedFeedCard from '../components/ai/EnhancedFeedCard';
import { useHeroFeed, useKPICards } from '../hooks/useHeroFeed';
import { useYouTubeShorts, YouTubeShort } from '../hooks/useYouTubeShorts';
import { AlertTriangle, CheckCircle, XCircle, Bell, Search, ChevronRight, BarChart2, Filter, RefreshCw, Truck, Calendar, Fuel, TrendingDown, FileX, FileText, PenTool as Tool, Sparkles, Play, Volume2, VolumeX, Heart, MessageCircle, Share2, Video, VideoOff, Home, LayoutGrid, List, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabaseClient';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Checkbox from '../components/ui/Checkbox';
import Button from '../components/ui/Button';
import AlertActionModal from '../components/alerts/AlertActionModal';
import AlertDetailsModal from '../components/alerts/AlertDetailsModal';
import AlertTypeTag from '../components/alerts/AlertTypeTag';
import { safeFormatDate, formatRelativeDate } from '../utils/dateUtils';
import { formatKmPerLitre } from '../utils/format';
import { isValid } from 'date-fns';
import { Vehicle } from '@/types';
import { toast } from 'react-toastify';
import { createLogger } from '../utils/logger';

const logger = createLogger('AIAlertsPage');

const AIAlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<AIAlert[]>([]);
  const [activeTab, setActiveTab] = useState<'all-feed' | 'alerts' | 'driver-insights'>('all-feed');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState<any[]>([]);
  const [vehicleMap, setVehicleMap] = useState<Record<string, Vehicle>>({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    severity: 'all',
    vehicle: 'all',
    status: 'pending'
  });
  const [groupByVehicle, setGroupByVehicle] = useState(false);
  const [actionModal, setActionModal] = useState<{
    type: 'accept' | 'deny' | 'ignore';
    alert: AIAlert;
  } | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<AIAlert | null>(null);
  const [runningCheck, setRunningCheck] = useState(false);

  // Hero Feed state
  const [selectedFilters, setSelectedFilters] = useState<string[]>(['all']);
  const [showVideos, setShowVideos] = useState(() => {
    const saved = localStorage.getItem('showVideos');
    return saved !== null ? JSON.parse(saved) : true; // Default to true
  });

  // YouTube video state
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const videoRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Enhanced feed state
  const [feedFilters, setFeedFilters] = useState<string[]>(['all']);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);

  // Fetch alerts and vehicles data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch alerts
        const alertsData = await getAIAlerts();
        const alertsArray = Array.isArray(alertsData) ? alertsData : [];
        setAlerts(alertsArray);
        
        // Fetch all data for both tabs
        const [vehiclesData, driversData, tripsData] = await Promise.all([
          getVehicles(),
          getDrivers(),
          getTrips()
        ]);
        
        const vehiclesArray = Array.isArray(vehiclesData) ? vehiclesData : [];
        const driversArray = Array.isArray(driversData) ? driversData : [];
        const tripsArray = Array.isArray(tripsData) ? tripsData : [];
        
        setVehicles(vehiclesArray);
        setDrivers(driversArray);
        setTrips(tripsArray);
        setMaintenanceTasks([]); // Initialize empty for now
        
        // Create vehicle lookup map for efficient access
        const vehicleMapData: Record<string, Vehicle> = {};
        vehiclesArray.forEach(vehicle => {
          vehicleMapData[vehicle.id] = vehicle;
        });
        setVehicleMap(vehicleMapData);
      } catch (error) {
        logger.error('Error fetching AI alerts data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // YouTube video intersection observer
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            setIsPlaying(true);
            // Force autoplay when video comes into view
            const iframe = entry.target.querySelector('iframe');
            if (iframe) {
              const newSrc = iframe.src.replace('autoplay=0', 'autoplay=1');
              iframe.src = newSrc;
            }
          } else if (entry.intersectionRatio < 0.3) {
            setIsPlaying(false);
          }
        });
      },
      {
        threshold: [0, 0.3, 0.5, 1],
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
  }, [currentVideoIndex]);

  // Toggle video visibility
  const toggleVideos = () => {
    const newValue = !showVideos;
    setShowVideos(newValue);
    localStorage.setItem('showVideos', JSON.stringify(newValue));
  };

  // Hero Feed logic
  const feedKinds = useMemo(() => {
    if (selectedFilters.includes('all')) {
      return [];
    }
    return selectedFilters.filter(kind => kind !== 'media');
  }, [selectedFilters]);

  const {
    data: heroFeedData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: heroFeedLoading,
    refetch: refetchHeroFeed
  } = useHeroFeed({
    kinds: feedKinds,
    limit: 20
  });

  const { data: kpiCards, refetch: refetchKPIs } = useKPICards();

  // Fetch drivers map for photo lookup
  const { data: driversMap } = useQuery({
    queryKey: ['drivers-map'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('drivers')
          .select('id, name, driver_photo_url, photo_url, contact_number, status');

        if (error) throw error;

        const map: Record<string, any> = {};
        data?.forEach(driver => {
          map[driver.id] = {
            ...driver,
            photo_url: driver.driver_photo_url || driver.photo_url
          };
        });
        return map;
      } catch (error) {
        logger.error('Error fetching drivers:', error);
        return {};
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch vehicles map for photo lookup
  const { data: vehiclesMap } = useQuery({
    queryKey: ['vehicles-map'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('vehicles')
          .select('id, registration_number, make, model, photo_url, status, type');

        if (error) throw error;

        const map: Record<string, any> = {};
        data?.forEach(vehicle => {
          map[vehicle.id] = vehicle;
        });
        return map;
      } catch (error) {
        logger.error('Error fetching vehicles:', error);
        return {};
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Check if YouTube API key is available
  const hasYouTubeAPIKey = !!import.meta.env.VITE_YOUTUBE_API_KEY;

  // Fetch dynamic YouTube shorts only if API key is available
  const {
    data: youtubeShorts,
    isLoading: shortsLoading,
    error: shortsError,
    refetch: refetchShorts
  } = useYouTubeShorts({
    count: 20,
    enabled: hasYouTubeAPIKey
  });


  const availableShorts = youtubeShorts || [];
  const events = useMemo(() => (heroFeedData?.pages ?? []).flat(), [heroFeedData]);

  // Media cards for YouTube content
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

  // Calculate feed statistics
  const feedStats = useMemo(() => {
    const stats = {
      ai_alerts: 0,
      trips: 0,
      maintenance: 0,
      documents: 0,
      kpis: 0,
      activities: 0,
      total: 0
    };

    events.forEach(event => {
      stats.total++;
      switch (event.kind) {
        case 'ai_alert': stats.ai_alerts++; break;
        case 'trip': stats.trips++; break;
        case 'maintenance': stats.maintenance++; break;
        case 'vehicle_doc': stats.documents++; break;
        case 'kpi': stats.kpis++; break;
        case 'activity':
        case 'vehicle_activity': stats.activities++; break;
      }
    });

    return stats;
  }, [events]);

  // Filter events based on feedFilters
  const filteredEvents = useMemo(() => {
    if (feedFilters.includes('all')) return events;
    return events.filter(e => feedFilters.includes(e.kind));
  }, [events, feedFilters]);

  // Handle filter toggle
  const handleFeedFilterToggle = (filter: string) => {
    if (filter === 'all') {
      setFeedFilters(['all']);
    } else {
      const newFilters = feedFilters.includes(filter)
        ? feedFilters.filter(f => f !== filter)
        : [...feedFilters.filter(f => f !== 'all'), filter];

      setFeedFilters(newFilters.length === 0 ? ['all'] : newFilters);
    }
  };

  // Handle alert actions from EnhancedFeedCard
  const handleAlertAction = async (eventId: string, action: 'accept' | 'reject') => {
    try {
      const { error } = await supabase
        .from('events_feed')
        .update({
          status: action === 'accept' ? 'accepted' : 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (error) throw error;

      toast.success(`Alert ${action === 'accept' ? 'accepted' : 'rejected'}`);
      refetchHeroFeed(); // Refresh feed
    } catch (error) {
      logger.error('Error updating alert:', error);
      toast.error('Failed to update alert');
    }
  };

  // Handle alert action modal submission
  const handleActionSubmit = async (reason: string, duration?: 'week' | 'permanent') => {
    if (actionModal) {
      try {
        await processAlertAction(actionModal.alert.id, actionModal.type, reason, duration);
        
        // Update alert in state
        setAlerts(prevAlerts => prevAlerts.map(alert => 
          alert.id === actionModal.alert.id
            ? { 
                ...alert, 
                status: actionModal.type === 'accept' ? 'accepted' : actionModal.type === 'deny' ? 'denied' : 'ignored',
                metadata: { 
                  ...alert.metadata, 
                  resolution_reason: reason,
                  resolution_comment: reason,
                  ignore_duration: duration,
                  resolved_at: new Date().toISOString()
                }
              }
            : alert
        ));
        
        toast.success(`Alert ${actionModal.type === 'accept' ? 'accepted' : actionModal.type === 'deny' ? 'denied' : 'ignored'} successfully`);
      } catch (error) {
        logger.error('Error processing alert action:', error);
        toast.error('Failed to process alert action');
      }
      setActionModal(null);
    }
  };

  // Run AI check again
  const handleRunAICheck = async () => {
    setRunningCheck(true);
    try {
      const newAlertCount = await runAlertScan();
      
      // Refresh alerts list
      const refreshedAlerts = await getAIAlerts();
      setAlerts(Array.isArray(refreshedAlerts) ? refreshedAlerts : []);
      
      toast.success(`AI check complete: ${newAlertCount} new alert${newAlertCount !== 1 ? 's' : ''} generated`);
    } catch (error) {
      logger.error('Error running AI check:', error);
      toast.error('Failed to run AI check');
    } finally {
      setRunningCheck(false);
    }
  };

  // Helper to get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning-100 text-warning-700';
      case 'accepted': return 'bg-success-100 text-success-700';
      case 'denied': return 'bg-error-100 text-error-700';
      case 'ignored': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Helper to get severity icon
  const getSeverityIcon = (severity: string, alertType: string) => {
    // First check by alert type
    switch (alertType) {
      case 'fuel_anomaly':
        return <Fuel className="h-4 w-4 text-amber-500" />;
      case 'route_deviation':
        return <TrendingDown className="h-4 w-4 text-blue-500" />;
      case 'frequent_maintenance':
        return <Tool className="h-4 w-4 text-orange-500" />;
      case 'documentation':
        return <FileX className="h-4 w-4 text-purple-500" />;
      default:
        // Fall back to severity-based icons
        switch (severity) {
          case 'high': return <AlertTriangle className="h-4 w-4 text-error-500" />;
          case 'medium': return <AlertTriangle className="h-4 w-4 text-warning-500" />;
          default: return <AlertTriangle className="h-4 w-4 text-gray-400" />;
        }
    }
  };

  // Prepare alert message details with expected/actual values
  const getAlertMessageDetails = (alert: AIAlert) => {
    if (!alert.metadata) return alert.description;
    
    const { expected_value, actual_value, deviation } = alert.metadata;
    
    if (expected_value !== undefined && actual_value !== undefined) {
      // Special handling for fuel anomaly alerts
      if (alert.alert_type === 'fuel_anomaly') {
        const expectedMileage = Number(expected_value);
        const actualMileage = Number(actual_value);
        const calculatedDeviation = ((actualMileage - expectedMileage) / expectedMileage) * 100;
        
        const formattedExpected = expectedMileage.toFixed(2);
        const formattedActual = actualMileage.toFixed(2);
        const formattedDeviation = calculatedDeviation.toFixed(1);
        
        return (
          <div>
            <div className="font-medium">Fuel anomaly detected: {formattedActual} km/L ({formattedDeviation}%)</div>
            <div className="text-xs text-gray-600 mt-1">
              Expected: {formattedExpected}, Actual: {formattedActual}
            </div>
          </div>
        );
      }
      
      // General handling for other alert types with deviation
      if (deviation !== undefined) {
        const deviationSymbol = deviation > 0 ? '↑' : '↓';
        const absDeviation = Math.abs(Number(deviation));
        
        return (
          <div>
            <div className="font-medium">{alert.title}</div>
            <div className="text-xs text-gray-600 mt-1">
              Expected: {expected_value}, Actual: {actual_value} 
              <span className={deviation > 0 ? 'text-error-600' : 'text-success-600'}>
                {' '}{deviationSymbol}{absDeviation.toFixed(1)}%
              </span>
            </div>
          </div>
        );
      }
    }
    
    return alert.description;
  };

  // Filter alerts based on user selections
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      // Search filter
      if (filters.search && alert.affected_entity) {
        const vehicle = alert.affected_entity.type === 'vehicle' 
          ? vehicleMap[alert.affected_entity.id]
          : null;
          
        const searchTerm = filters.search.toLowerCase();
        const searchFields = [
          alert.title,
          alert.description,
          vehicle?.registration_number
        ].map(field => field?.toLowerCase());

        if (!searchFields.some(field => field?.includes(searchTerm))) {
          return false;
        }
      }

      // Type filter
      if (filters.type !== 'all' && alert.alert_type !== filters.type) {
        return false;
      }

      // Severity filter
      if (filters.severity !== 'all' && alert.severity !== filters.severity) {
        return false;
      }

      // Vehicle filter
      if (filters.vehicle !== 'all' && 
          alert.affected_entity?.type === 'vehicle' && 
          alert.affected_entity?.id !== filters.vehicle) {
        return false;
      }

      // Status filter
      if (filters.status !== 'all' && alert.status !== filters.status) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      // Sort by date first
      const dateA = new Date(a.created_at || '');
      const dateB = new Date(b.created_at || '');
      
      // Handle invalid dates by putting them at the end
      if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;
      
      const dateCompare = dateB.getTime() - dateA.getTime();
      
      // If dates are the same, sort by severity (high → medium → low)
      if (dateCompare === 0) {
        const severityOrder = { high: 0, medium: 1, low: 2 };
        return (severityOrder[a.severity as keyof typeof severityOrder] || 3) - 
               (severityOrder[b.severity as keyof typeof severityOrder] || 3);
      }
      
      return dateCompare;
    });
  }, [alerts, filters, vehicleMap]);

  // Group alerts by vehicle if groupByVehicle is enabled
  const groupedAlerts = useMemo(() => {
    if (!groupByVehicle) return null;
    
    const groups: Record<string, { vehicle: Vehicle | null, alerts: AIAlert[] }> = {};
    
    filteredAlerts.forEach(alert => {
      if (alert.affected_entity?.type === 'vehicle') {
        const vehicleId = alert.affected_entity.id;
        if (!groups[vehicleId]) {
          groups[vehicleId] = {
            vehicle: vehicleMap[vehicleId] || null,
            alerts: []
          };
        }
        groups[vehicleId].alerts.push(alert);
      } else {
        // For non-vehicle alerts, group under "other"
        if (!groups['other']) {
          groups['other'] = {
            vehicle: null,
            alerts: []
          };
        }
        groups['other'].alerts.push(alert);
      }
    });
    
    return groups;
  }, [filteredAlerts, groupByVehicle, vehicleMap]);

  // Handle alert actions
  const handleAction = async (alert: AIAlert, action: 'accept' | 'deny' | 'ignore') => {
    setActionModal({ type: action, alert });
  };

  // YouTube Video Component
  const YouTubeVideoCard = ({ short, index }: { short: YouTubeShort; index: number }) => {
    const videoId = short.id;
    
    if (!showVideos) {
      return null;
    }

    if (shortsLoading) {
      return (
        <div className="relative w-full max-w-2xl mx-auto rounded-xl overflow-hidden bg-black shadow-2xl my-6"
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
            src={`https://www.youtube.com/embed/${short.id}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&loop=1&playlist=${short.id}&playsinline=1&modestbranding=1&rel=0&fs=0&disablekb=1&start=0&enablejsapi=1`}
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

            <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-auto">
              <div className="flex items-end justify-between">
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2">
                    {short.title}
                  </h3>
                  <p className="text-gray-200 text-sm mb-3 line-clamp-2">
                    {short.description}
                  </p>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleLike}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
                        liked ? 'bg-red-500 text-white' : 'bg-black/60 text-white hover:bg-black/80'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                      <span className="text-xs font-medium">Like</span>
                    </button>
                    
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all">
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-xs font-medium">Comment</span>
                    </button>
                    
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all">
                      <Share2 className="w-4 h-4" />
                      <span className="text-xs font-medium">Share</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      {/* Page Header */}
      <div className="rounded-xl border bg-white dark:bg-white px-4 py-3 shadow-sm mb-6">
        <div className="flex items-center group">
          <Bell className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 transition" />
          <h1 className="text-2xl font-display font-semibold tracking-tight-plus text-gray-900 dark:text-gray-100">
            {activeTab === 'all-feed' ? 'AI Alerts & Feed' : activeTab === 'alerts' ? 'AI Alerts' : 'Driver AI Insights'}
          </h1>
        </div>
        <p className="text-sm font-sans text-gray-500 dark:text-gray-400 mt-1 ml-7">
          {activeTab === 'all-feed' 
            ? 'Complete feed with AI alerts, media, and insights' 
            : activeTab === 'alerts' 
            ? 'Review and manage AI alerts for your fleet' 
            : 'AI-powered driver performance insights'}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              className={`py-4 text-sm font-sans font-medium border-b-2 transition-colors ${
                activeTab === 'all-feed'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('all-feed')}
            >
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                <span>All Feed</span>
              </div>
            </button>
            
            <button
              className={`py-4 text-sm font-sans font-medium border-b-2 transition-colors ${
                activeTab === 'alerts'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('alerts')}
            >
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span>AI Alerts</span>
              </div>
            </button>
            
            <button
              className={`py-4 text-sm font-sans font-medium border-b-2 transition-colors ${
                activeTab === 'driver-insights'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('driver-insights')}
            >
              <div className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4" />
                <span>Driver Insights</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="ml-3 font-sans text-gray-600">
            Loading alerts...
          </p>
        </div>
      ) : (
        <>
          {activeTab === 'all-feed' ? (
            <div className="space-y-6">
              {/* Enhanced Hero Feed Content */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                {/* Header with Controls */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <Bell className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      AI Alerts & Activity Feed
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Real-time fleet activities with AI insights
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {/* View Mode Toggle */}
                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                      <button
                        onClick={() => setViewMode('cards')}
                        className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                          viewMode === 'cards' ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        <LayoutGrid className="h-4 w-4" />
                        <span className="text-sm font-medium hidden sm:inline">Cards</span>
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                          viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        <List className="h-4 w-4" />
                        <span className="text-sm font-medium hidden sm:inline">List</span>
                      </button>
                    </div>

                    {/* Auto Scroll Toggle */}
                    <button
                      onClick={() => setIsAutoScrollEnabled(!isAutoScrollEnabled)}
                      className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                        isAutoScrollEnabled
                          ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/70'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <ChevronDown className={`h-4 w-4 ${isAutoScrollEnabled ? 'animate-bounce' : ''}`} />
                      <span className="text-sm font-medium hidden sm:inline">Auto Scroll</span>
                      <span className="text-xs sm:hidden">{isAutoScrollEnabled ? 'ON' : 'OFF'}</span>
                    </button>

                    {/* Refresh Button */}
                    <button
                      onClick={() => {
                        refetchHeroFeed();
                        refetchKPIs();
                        if (hasYouTubeAPIKey) refetchShorts();
                      }}
                      disabled={heroFeedLoading}
                      className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2 transition-colors"
                    >
                      <RefreshCw className={`h-4 w-4 ${heroFeedLoading ? 'animate-spin' : ''}`} />
                      <span className="text-sm font-medium hidden sm:inline">Refresh</span>
                    </button>

                    {/* Video Toggle */}
                    <button
                      onClick={toggleVideos}
                      className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                        showVideos
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md hover:shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title={showVideos ? 'Hide video reels' : 'Show video reels'}
                    >
                      {showVideos ? (
                        <>
                          <Video className="w-4 h-4" />
                          <span className="text-sm font-medium hidden sm:inline">Videos ON</span>
                        </>
                      ) : (
                        <>
                          <VideoOff className="w-4 h-4" />
                          <span className="text-sm font-medium hidden sm:inline">Videos OFF</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Social Media Scroller Layout */}
                <div className="max-w-4xl mx-auto">
                  {/* Stats Grid - Clickable Filter Cards */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3 mb-6">
                    <button
                      onClick={() => handleFeedFilterToggle('ai_alert')}
                      className={`p-3 rounded-lg border-2 transition-all transform hover:scale-105 ${
                        feedFilters.includes('ai_alert')
                          ? 'bg-red-500 border-red-600 text-white'
                          : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-2xl font-bold">{feedStats.ai_alerts}</div>
                        <div className={`text-xs mt-1 ${feedFilters.includes('ai_alert') ? 'opacity-90' : 'opacity-70'}`}>
                          AI Alerts
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleFeedFilterToggle('trip')}
                      className={`p-3 rounded-lg border-2 transition-all transform hover:scale-105 ${
                        feedFilters.includes('trip')
                          ? 'bg-green-500 border-green-600 text-white'
                          : 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-2xl font-bold">{feedStats.trips}</div>
                        <div className={`text-xs mt-1 ${feedFilters.includes('trip') ? 'opacity-90' : 'opacity-70'}`}>
                          Trips
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleFeedFilterToggle('maintenance')}
                      className={`p-3 rounded-lg border-2 transition-all transform hover:scale-105 ${
                        feedFilters.includes('maintenance')
                          ? 'bg-orange-500 border-orange-600 text-white'
                          : 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/40'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-2xl font-bold">{feedStats.maintenance}</div>
                        <div className={`text-xs mt-1 ${feedFilters.includes('maintenance') ? 'opacity-90' : 'opacity-70'}`}>
                          Maintenance
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleFeedFilterToggle('vehicle_doc')}
                      className={`p-3 rounded-lg border-2 transition-all transform hover:scale-105 ${
                        feedFilters.includes('vehicle_doc')
                          ? 'bg-blue-500 border-blue-600 text-white'
                          : 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-2xl font-bold">{feedStats.documents}</div>
                        <div className={`text-xs mt-1 ${feedFilters.includes('vehicle_doc') ? 'opacity-90' : 'opacity-70'}`}>
                          Documents
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleFeedFilterToggle('kpi')}
                      className={`p-3 rounded-lg border-2 transition-all transform hover:scale-105 ${
                        feedFilters.includes('kpi')
                          ? 'bg-purple-500 border-purple-600 text-white'
                          : 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-2xl font-bold">{feedStats.kpis}</div>
                        <div className={`text-xs mt-1 ${feedFilters.includes('kpi') ? 'opacity-90' : 'opacity-70'}`}>
                          KPIs
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleFeedFilterToggle('all')}
                      className={`p-3 rounded-lg border-2 transition-all transform hover:scale-105 ${
                        feedFilters.includes('all')
                          ? 'bg-gray-500 border-gray-600 text-white'
                          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-2xl font-bold">{feedStats.total}</div>
                        <div className={`text-xs mt-1 ${feedFilters.includes('all') ? 'opacity-90' : 'opacity-70'}`}>
                          All
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Active Filters Display */}
                  {!feedFilters.includes('all') && feedFilters.length > 0 && (
                    <div className="mb-4 flex items-center gap-2 flex-wrap">
                      <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Active filters:</span>
                      {feedFilters.map(filter => (
                        <span
                          key={filter}
                          className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium"
                        >
                          {filter.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Feed Items */}
                  <div className="space-y-4">
                    {heroFeedLoading ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading feed...</p>
                      </div>
                    ) : filteredEvents.length > 0 ? (
                      <>
                        {/* Show videos even if no events */}
                        {showVideos && availableShorts.length > 0 && (
                          <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                              <Play className="h-5 w-5 text-primary-600" />
                              Fleet Tips & Insights
                            </h3>
                            <div className="space-y-6">
                              {availableShorts.slice(0, 3).map((short, index) => (
                                <YouTubeVideoCard key={short.id} short={short} index={index} />
                              ))}
                            </div>
                          </div>
                        )}

                        {filteredEvents.map((event, index) => {
                          // Intersperse videos every 4 events
                          const shouldShowVideo = showVideos &&
                            availableShorts.length > 0 &&
                            index > 0 &&
                            index % 4 === 0;

                          const videoIndex = Math.floor(index / 4) % availableShorts.length;
                          const short = availableShorts[videoIndex];

                          // Get driver and vehicle data for trip cards
                          const tripData = event.kind === 'trip' ? event.entity_json : null;
                          const driverData = tripData?.driver_id ? driversMap?.[tripData.driver_id] : null;
                          const vehicleData = tripData?.vehicle_id ? vehiclesMap?.[tripData.vehicle_id] : null;

                          return (
                            <React.Fragment key={`fragment-${event.id}`}>
                              {shouldShowVideo && (
                                <YouTubeVideoCard
                                  key={`video-${short.id}`}
                                  short={short}
                                  index={videoIndex}
                                />
                              )}

                              {/* Enhanced Event Card */}
                              <EnhancedFeedCard
                                key={`${event.id}-${index}`}
                                event={event}
                                onAction={handleAlertAction}
                                driverData={driverData}
                                vehicleData={vehicleData}
                              />
                            </React.Fragment>
                          );
                        })}

                        {hasNextPage && (
                          <div className="text-center pt-4">
                            <Button
                              variant="outline"
                              onClick={() => fetchNextPage()}
                              disabled={isFetchingNextPage}
                              icon={isFetchingNextPage ? <RefreshCw className="h-4 w-4 animate-spin" /> : undefined}
                            >
                              {isFetchingNextPage ? 'Loading...' : 'Load More'}
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
                        <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">No events to display</p>
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                          {feedFilters.includes('all')
                            ? 'Events will appear here as they occur'
                            : 'No events match your selected filters'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'driver-insights' ? (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-display font-semibold tracking-tight-plus text-gray-900">Driver AI Insights</h2>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/drivers/insights')}
                    icon={<BarChart2 className="h-4 w-4" />}
                  >
                    View Full Dashboard
                  </Button>
                </div>
                
                {drivers.length > 0 && vehicles.length > 0 ? (
                  <DriverAIInsights
                    allDrivers={drivers}
                    trips={trips}
                    vehicles={vehicles}
                    maintenanceTasks={maintenanceTasks}
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <BarChart2 className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="font-sans">No driver data available for insights</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
        <div className="space-y-4">
          {/* Enhanced Filter Bar */}
          <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center gap-3 sm:gap-4">
              <div className="w-full md:flex-1">
                <Input
                  placeholder="Search alerts..."
                  icon={<Search className="h-4 w-4" />}
                  value={filters.search}
                  onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                />
              </div>
              
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 w-full">
                <Select
                  options={[
                    { value: 'all', label: 'All Types' },
                    { value: 'fuel_anomaly', label: 'Fuel Anomaly' },
                    { value: 'route_deviation', label: 'Route Deviation' },
                    { value: 'frequent_maintenance', label: 'Frequent Maintenance' },
                    { value: 'documentation', label: 'Documentation' }
                  ]}
                  value={filters.type}
                  onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
                  className="w-full"
                />
                
                <Select
                  options={[
                    { value: 'all', label: 'All Severity' },
                    { value: 'high', label: 'High' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'low', label: 'Low' }
                  ]}
                  value={filters.severity}
                  onChange={e => setFilters(f => ({ ...f, severity: e.target.value }))}
                  className="w-full"
                />
                
                <Select
                  options={[
                    { value: 'all', label: 'All Vehicles' },
                    ...vehicles.map(v => ({
                      value: v.id,
                      label: v.registration_number
                    }))
                  ]}
                  value={filters.vehicle}
                  onChange={e => setFilters(f => ({ ...f, vehicle: e.target.value }))}
                  className="w-full"
                />
                
                <Select
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'accepted', label: 'Accepted' },
                    { value: 'denied', label: 'Denied' },
                    { value: 'ignored', label: 'Ignored' }
                  ]}
                  value={filters.status}
                  onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                  className="w-full"
                />
              </div>
              
              <div className="flex flex-wrap items-center justify-between md:justify-end gap-2 sm:gap-3 w-full md:w-auto">
                <div className="w-full xs:w-auto">
                  <Checkbox
                  label="Group by Vehicle"
                  checked={groupByVehicle}
                  onChange={e => setGroupByVehicle(e.target.checked)}
                  />
                </div>
                
                <Button
                  onClick={handleRunAICheck}
                  isLoading={runningCheck}
                  icon={<RefreshCw className="h-4 w-4" />}
                  inputSize="sm"
                  className="w-full xs:w-auto"
                >
                  Run AI Check
                </Button>
              </div>
            </div>
          </div>

          {/* Alerts Display */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {groupByVehicle ? (
              // Grouped by vehicle view 
              <div>
                {groupedAlerts && Object.keys(groupedAlerts).length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {Object.entries(groupedAlerts).map(([groupKey, { vehicle, alerts }]) => (
                      <div key={groupKey} className="p-4">
                        <div className="mb-4 flex items-center">
                          {vehicle ? (
                            <div className="flex items-center">
                              <Truck className="h-5 w-5 text-primary-500 mr-2" />
                              <h3 className="text-lg font-display font-medium tracking-tight-plus text-gray-900">{vehicle.registration_number}</h3>
                              <p className="ml-2 text-sm font-sans text-gray-500">({vehicle.make} {vehicle.model})</p>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <BarChart2 className="h-5 w-5 text-gray-500 mr-2" />
                              <h3 className="text-lg font-display font-medium tracking-tight-plus text-gray-900">Other Alerts</h3>
                            </div>
                          )}
                          <div className="ml-auto text-sm font-sans text-gray-500">
                            {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-sans font-medium text-gray-500">Type</th>
                                <th className="px-3 py-2 text-left text-xs font-sans font-medium text-gray-500">Alert</th>
                                <th className="px-3 py-2 text-left text-xs font-sans font-medium text-gray-500">Status</th>
                                <th className="px-3 py-2 text-left text-xs font-sans font-medium text-gray-500">Time</th>
                                <th className="px-3 py-2 text-center text-xs font-sans font-medium text-gray-500">Details</th>
                                <th className="px-3 py-2 text-right text-xs font-sans font-medium text-gray-500">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {alerts.map(alert => (
                                <tr key={alert.id} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 whitespace-nowrap">
                                    <div className="flex items-center">
                                      {getSeverityIcon(alert.severity, alert.alert_type)}
                                      <AlertTypeTag 
                                        type={alert.alert_type} 
                                        className="ml-2"
                                      />
                                    </div>
                                  </td>
                                  <td className="px-3 py-2">
                                    {getAlertMessageDetails(alert)}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap">
                                    <span className={`inline-flex text-xs px-2 py-1 rounded-full ${getStatusColor(alert.status)}`}>
                                      {alert.status}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-xs font-sans text-gray-500">
                                    {formatRelativeDate(alert.created_at)}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-center">
                                    <button
                                      onClick={() => setSelectedAlert(alert)}
                                      className="text-primary-600 hover:text-primary-800"
                                      title="View Alert Details"
                                    >
                                      <ChevronRight className="h-4 w-4" />
                                    </button>
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-right">
                                    {alert.status === 'pending' && (
                                      <div className="flex justify-end space-x-2">
                                        <button
                                          onClick={() => handleAction(alert, 'accept')}
                                          className="text-success-600 hover:text-success-700"
                                          title="Accept Alert"
                                        >
                                          <CheckCircle className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={() => handleAction(alert, 'deny')}
                                          className="text-error-600 hover:text-error-700"
                                          title="Dismiss Alert"
                                        >
                                          <XCircle className="h-4 w-4" />
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="font-sans text-gray-500 mb-4">No alerts match your current filters</p>
                    <div className="flex justify-center gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setFilters({
                          search: '',
                          type: 'all',
                          severity: 'all',
                          vehicle: 'all',
                          status: 'pending'
                        })}
                      >
                        Reset Filters
                      </Button>
                      <Button
                        onClick={handleRunAICheck}
                        isLoading={runningCheck}
                      >
                        Run AI Check
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Regular table view
              <div>
                {filteredAlerts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-sans font-medium text-gray-500">Type</th>
                          <th className="px-3 py-2 text-left text-xs font-sans font-medium text-gray-500">Alert</th>
                          <th className="px-3 py-2 text-left text-xs font-sans font-medium text-gray-500">Vehicle</th>
                          <th className="px-3 py-2 text-left text-xs font-sans font-medium text-gray-500">Status</th>
                          <th className="px-3 py-2 text-left text-xs font-sans font-medium text-gray-500">Time</th>
                          <th className="px-3 py-2 text-center text-xs font-sans font-medium text-gray-500">Details</th>
                          <th className="px-3 py-2 text-right text-xs font-sans font-medium text-gray-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredAlerts.map(alert => {
                          const vehicle = alert.affected_entity?.type === 'vehicle' 
                            ? vehicleMap[alert.affected_entity.id] 
                            : null;
                            
                          return (
                            <tr key={alert.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 whitespace-nowrap">
                                <div className="flex items-center">
                                  {getSeverityIcon(alert.severity, alert.alert_type)}
                                  <AlertTypeTag 
                                    type={alert.alert_type} 
                                    className="ml-2"
                                  />
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                {getAlertMessageDetails(alert)}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                {vehicle ? (
                                  <div>
                                    <p className="text-sm font-sans font-medium text-primary-600">
                                      {vehicle.registration_number}
                                    </p>
                                    <p className="text-xs font-sans text-gray-500">
                                      {vehicle.make} {vehicle.model}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-sm font-sans text-gray-500">-</span>
                                )}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <span className={`inline-flex text-xs px-2 py-1 rounded-full ${getStatusColor(alert.status)}`}>
                                  {alert.status}
                                </span>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-xs font-sans text-gray-500">
                                {formatRelativeDate(alert.created_at)}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-center">
                                <button
                                  onClick={() => setSelectedAlert(alert)}
                                  className="text-primary-600 hover:text-primary-800"
                                  title="View Alert Details"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </button>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-right">
                                {alert.status === 'pending' && (
                                  <div className="flex justify-end space-x-2">
                                    <button
                                      onClick={() => handleAction(alert, 'accept')}
                                      className="text-success-600 hover:text-success-700"
                                      title="Accept Alert"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleAction(alert, 'deny')}
                                      className="text-error-600 hover:text-error-700"
                                      title="Dismiss Alert"
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="font-sans text-gray-500 mb-4">No alerts match your current filters</p>
                    <div className="flex justify-center gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setFilters({
                          search: '',
                          type: 'all',
                          severity: 'all',
                          vehicle: 'all',
                          status: 'pending'
                        })}
                      >
                        Reset Filters
                      </Button>
                      <Button
                        onClick={handleRunAICheck}
                        isLoading={runningCheck}
                      >
                        Run AI Check
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
          )}
        </>
      )}

      {/* Action Modal */}
      {actionModal && (
        <AlertActionModal
          type={actionModal.type}
          onSubmit={handleActionSubmit}
          onClose={() => setActionModal(null)}
        />
      )}

      {/* Alert Details Modal */}
      {selectedAlert && (
        <AlertDetailsModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
        />
      )}
    </Layout>
  );
};

export default AIAlertsPage;