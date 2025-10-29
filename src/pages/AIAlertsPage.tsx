import React, { useState, useEffect, useMemo, useRef } from 'react';
import Layout from '../components/layout/Layout';
import { AIAlert, Driver, Trip, Vehicle } from '@/types';
import { getAIAlerts, processAlertAction, runAlertScan } from '../utils/aiAnalytics';
import { getVehicle, getVehicles } from '../utils/storage';
import { getDrivers } from '../utils/api/drivers';
import { getTrips } from '../utils/storage';
import DriverAIInsights from '../components/ai/DriverAIInsights';
import MediaCard from '../components/HeroFeed/MediaCard';
import EnhancedFeedCard from '../components/ai/EnhancedFeedCard';
import { useHeroFeed, useKPICards } from '../hooks/useHeroFeed';
import { useYouTubeShorts, YouTubeShort } from '../hooks/useYouTubeShorts';
import { AlertTriangle, CheckCircle, XCircle, Bell, Search, ChevronRight, BarChart2, Filter, RefreshCw, Truck, Calendar, Fuel, TrendingDown, FileX, FileText, PenTool as Tool, Sparkles, Play, Volume2, VolumeX, Heart, MessageCircle, Share2, Video, VideoOff, Home } from 'lucide-react';
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
import { toast } from 'react-toastify';
import { createLogger } from '../utils/logger';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabaseClient';

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

  // Fetch drivers map for photo lookup in EnhancedFeedCard
  const { data: driversMap, error: driversError, isLoading: driversLoading } = useQuery({
    queryKey: ['drivers-map'],
    queryFn: async () => {
      // Get user's organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {};

      // Get user's active organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.active_organization_id) return {};

      const { data, error } = await supabase
        .from('drivers')
        .select('id, name, driver_photo_url, contact_number, status')
        .eq('organization_id', profile.active_organization_id);

      if (error) throw error;

      const map: Record<string, any> = {};
      data?.forEach(driver => {
        map[driver.id] = {
          ...driver,
          photo_url: driver.driver_photo_url  // Normalize to photo_url for consistency
        };
      });
      return map;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch vehicles map for photo lookup in EnhancedFeedCard
  const { data: vehiclesMap, error: vehiclesError, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles-map'],
    queryFn: async () => {
      // Get user's organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {};

      // Get user's active organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.active_organization_id) return {};

      const { data, error } = await supabase
        .from('vehicles')
        .select('id, registration_number, make, model, photo_url')
        .eq('organization_id', profile.active_organization_id);

      if (error) throw error;

      const map: Record<string, any> = {};
      data?.forEach(vehicle => {
        map[vehicle.id] = vehicle;
      });
      return map;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // YouTube video state
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const videoRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);


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
              {/* Hero Feed Content */}
              <div className="bg-white rounded-lg shadow-sm">
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                      <Bell className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Fleet Activity</h3>
                      <p className="text-xs text-gray-500">Real-time updates from your fleet</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      refetchHeroFeed();
                      refetchKPIs();
                      if (hasYouTubeAPIKey) refetchShorts();
                    }}
                    icon={<RefreshCw className="h-4 w-4" />}
                  >
                    Refresh
                  </Button>
                </div>
                <div className="p-4">
                
                {/* Feed Filters */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-gray-500">Filter:</span>
                    {['all', 'ai_alert', 'vehicle_doc', 'maintenance', 'trip', 'kpi', 'vehicle_activity', 'activity', 'media'].map(filter => (
                      <button
                        key={filter}
                        onClick={() => {
                          if (filter === 'all') {
                            setSelectedFilters(['all']);
                          } else {
                            setSelectedFilters(prev =>
                              prev.includes('all')
                                ? [filter]
                                : prev.includes(filter)
                                ? prev.filter(f => f !== filter)
                                : [...prev, filter]
                            );
                          }
                        }}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                          selectedFilters.includes(filter)
                            ? 'bg-teal-100 text-teal-700 border border-teal-300'
                            : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {filter === 'all' ? 'All' : filter.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Social Media Scroller Layout */}
                <div className="max-w-4xl mx-auto">
                  {/* Stats Grid - Compact Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
                    <div className="bg-gradient-to-br from-red-50 to-red-100 p-3 rounded-lg border border-red-200 hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-red-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xl font-bold text-red-700">{events.filter(e => e.kind === 'ai_alert').length}</p>
                          <p className="text-xs text-red-600 truncate">AI Alerts</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200 hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xl font-bold text-blue-700">{events.filter(e => e.kind === 'vehicle_doc').length}</p>
                          <p className="text-xs text-blue-600 truncate">Documents</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-3 rounded-lg border border-orange-200 hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-2">
                        <Tool className="h-4 w-4 text-orange-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xl font-bold text-orange-700">{events.filter(e => e.kind === 'maintenance').length}</p>
                          <p className="text-xs text-orange-600 truncate">Maintenance</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg border border-green-200 hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xl font-bold text-green-700">{events.filter(e => e.kind === 'trip').length}</p>
                          <p className="text-xs text-green-600 truncate">Trips</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-lg border border-purple-200 hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-2">
                        <BarChart2 className="h-4 w-4 text-purple-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xl font-bold text-purple-700">
                            {events.filter(e => e.kind === 'kpi').length + (kpiCards?.filter(card => card.kpi_payload?.type === 'kpi').length || 0)}
                          </p>
                          <p className="text-xs text-purple-600 truncate">KPIs</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-3 rounded-lg border border-pink-200 hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-2">
                        <Play className="h-4 w-4 text-pink-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xl font-bold text-pink-700">{availableShorts.length}</p>
                          <p className="text-xs text-pink-600 truncate">Videos</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Video Toggle - Compact */}
                  <div className="flex justify-end items-center mb-4">
                    <button
                      onClick={toggleVideos}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        showVideos
                          ? 'bg-teal-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title={showVideos ? 'Hide video reels' : 'Show video reels'}
                    >
                      {showVideos ? (
                        <>
                          <Video className="w-3.5 h-3.5" />
                          <span>Videos ON</span>
                        </>
                      ) : (
                        <>
                          <VideoOff className="w-3.5 h-3.5" />
                          <span>Videos OFF</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Social Media Scroller */}
                  <div className="space-y-3">
                    {heroFeedLoading ? (
                      <div className="text-center py-8">
                        <RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin text-primary-600" />
                        <p className="text-gray-500">Loading feed...</p>
                      </div>
                    ) : (
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

                        {events.length > 0 ? (
                          <>
                            {events.map((event, index) => {
                              // Intersperse videos every 3-4 events
                              const shouldShowVideo = showVideos &&
                                availableShorts.length > 0 &&
                                index > 0 &&
                                index % 4 === 0;

                              const videoIndex = Math.floor(index / 4) % availableShorts.length;
                              const short = availableShorts[videoIndex];

                              // Get driver and vehicle data for this event
                              const tripData = event.entity_json;
                              const driverData = tripData?.driver_id && driversMap ? driversMap[tripData.driver_id] : null;
                              const vehicleData = tripData?.vehicle_id && vehiclesMap ? vehiclesMap[tripData.vehicle_id] : null;

                              return (
                                <React.Fragment key={`fragment-${event.id}`}>
                                  {shouldShowVideo && (
                                    <YouTubeVideoCard
                                      key={`video-${short.id}`}
                                      short={short}
                                      index={videoIndex}
                                    />
                                  )}

                                  {/* Enhanced Feed Card with maps, photos, and metrics */}
                                  <EnhancedFeedCard
                                    key={`${event.id}-${index}`}
                                    event={event}
                                    vehicleData={vehicleData}
                                    driverData={driverData}
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
                          <div className="text-center py-8 text-gray-500">
                            <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p className="font-sans">No feed items available</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
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