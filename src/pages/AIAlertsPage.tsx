import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { AIAlert, Driver, Trip, Vehicle } from '@/types';
import { getAIAlerts, processAlertAction, runAlertScan } from '../utils/aiAnalytics';
import { getVehicle, getVehicles } from '../utils/storage';
import { getDrivers } from '../utils/api/drivers';
import { getTrips } from '../utils/storage';
import DriverAIInsights from '../components/ai/DriverAIInsights';
import MediaCard from '../components/HeroFeed/MediaCard';
import EnhancedFeedCard from '../components/ai/EnhancedFeedCard';
import TripCard from '../components/trips/TripCard';
import { useHeroFeed } from '../hooks/useHeroFeed';
import { useKPICards as useKPICardsData, useLatestKPIs } from '@/hooks/useKPICards';
import KPICard from '../components/kpi/KPICard';
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
import config from '../utils/env';

const logger = createLogger('AIAlertsPage');

const AIAlertsPage: React.FC = () => {
  const navigate = useNavigate();
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
  const [loadMoreNode, setLoadMoreNode] = useState<HTMLDivElement | null>(null);

  // Hero Feed state
  const [selectedFilters, setSelectedFilters] = useState<string[]>(['all']);
  const [showVideos, setShowVideos] = useState(() => {
    const saved = localStorage.getItem('showVideos');
    return saved !== null ? JSON.parse(saved) : true; // Default to true
  });
  const [includeDocuments, setIncludeDocuments] = useState(false); // Default to false
  const [showFutureEvents, setShowFutureEvents] = useState(() => {
    const saved = localStorage.getItem('showFutureEvents');
    return saved !== null ? JSON.parse(saved) : false; // Default to false - hide future dates
  });

  // Fetch drivers map for photo lookup in EnhancedFeedCard
  const { data: driversMap, error: driversError, isLoading: driversLoading, refetch: refetchDrivers } = useQuery({
    queryKey: ['drivers-map'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('id, name, driver_photo_url, photo_url, contact_number, status, email');

      if (error) throw error;

      const map: Record<string, any> = {};
      data?.forEach(driver => {
        // Prioritize driver_photo_url, fallback to photo_url
        let photoUrl = driver.driver_photo_url || driver.photo_url || null;

        // If photo URL exists and is not a full URL, make it a public URL
        if (photoUrl && !photoUrl.startsWith('http')) {
          try {
            const { data: urlData } = supabase.storage
              .from('driver-docs')
              .getPublicUrl(photoUrl);
            photoUrl = urlData?.publicUrl || photoUrl;
          } catch (e) {
            console.warn('Failed to get public URL for driver photo:', e);
          }
        }

        map[driver.id] = {
          ...driver,
          photo_url: photoUrl,
          name: driver.name || 'Unknown Driver'
        };
      });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch vehicles map for photo lookup in EnhancedFeedCard
  const { data: vehiclesMap, error: vehiclesError, isLoading: vehiclesLoading, refetch: refetchVehicles } = useQuery({
    queryKey: ['vehicles-map'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, registration_number, make, model, year, vehicle_photo_url, photo_url, vehicle_type');

      if (error) throw error;

      const map: Record<string, any> = {};
      data?.forEach(vehicle => {
        // Prioritize vehicle_photo_url, fallback to photo_url
        let photoUrl = vehicle.vehicle_photo_url || vehicle.photo_url || null;

        // If photo URL exists and is not a full URL, make it a public URL
        if (photoUrl && !photoUrl.startsWith('http')) {
          try {
            const { data: urlData} = supabase.storage
              .from('vehicle-photos')
              .getPublicUrl(photoUrl);
            photoUrl = urlData?.publicUrl || photoUrl;
          } catch (e) {
            console.warn('Failed to get public URL for vehicle photo:', e);
          }
        }

        map[vehicle.id] = {
          ...vehicle,
          photo_url: photoUrl,
          display_name: `${vehicle.registration_number} - ${vehicle.make || ''} ${vehicle.model || ''}`.trim()
        };
      });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch maintenance tasks for enrichment
  const { data: maintenanceTasksData, error: maintenanceError, isLoading: maintenanceLoading } = useQuery({
    queryKey: ['maintenance-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch KPI cards
  const {
    data: kpiCards,
    isLoading: kpiLoading,
    refetch: refetchKPIs
  } = useKPICardsData({ period: 'all', limit: 20 });

  // Fetch latest KPIs by theme for statistics
  const {
    data: latestKPIs,
    refetch: refetchLatestKPIs
  } = useLatestKPIs();

  // YouTube video state
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const videoRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const feedContainerRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    setLoadMoreNode(node);
  }, []);


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
    kinds: selectedFilters.includes('all') ? undefined : selectedFilters,
    includeDocuments: includeDocuments
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

  useEffect(() => {
    if (!loadMoreNode || !hasNextPage || heroFeedLoading) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        root: feedContainerRef.current ?? null,
        rootMargin: '160px 0px 320px 0px',
        threshold: 0.1
      }
    );

    observer.observe(loadMoreNode);

    return () => observer.disconnect();
  }, [loadMoreNode, fetchNextPage, hasNextPage, isFetchingNextPage, heroFeedLoading]);
  const events = useMemo(() => {
    const feedEvents = (heroFeedData?.pages ?? []).flat();
    const enrichedFeedEvents = feedEvents.map(event => {
      // Enrich trip events with full trip data from trips array
      if (event.kind === 'trip') {
        // Try multiple ways to get the trip ID
        const tripId = event.entity_json?.id || event.entity_json?.trip_id || event.id;

        // Log for debugging
        if (config.isDev) {
          console.log('Trip event entity_json:', event.entity_json);
          console.log('Attempting to match trip ID:', tripId);
        }

        if (tripId) {
          const fullTrip = trips.find(t => t.id === tripId);
          if (fullTrip) {
            if (config.isDev) {
              console.log('Found matching trip:', fullTrip);
            }
            return {
              ...event,
              entity_json: fullTrip
            };
          }
        }

        // If entity_json already looks like a full trip object with all fields, use it
        if (event.entity_json &&
            (event.entity_json.vehicle_id || event.entity_json.driver_id ||
             event.entity_json.start_km || event.entity_json.end_km)) {
          return event;
        }
      }

      // Enrich maintenance events with full task data from maintenance_tasks array
      if (event.kind === 'maintenance' && maintenanceTasksData) {
        // Try multiple ways to get the maintenance task ID
        const taskId = event.entity_json?.id || event.entity_json?.task_id || event.entity_json?.maintenance_task_id;

        if (taskId) {
          const fullTask = maintenanceTasksData.find((t: any) => t.id === taskId);
          if (fullTask) {
            return {
              ...event,
              entity_json: fullTask
            };
          }
        }

        // If entity_json already looks like a full task object, use it
        if (event.entity_json && event.entity_json.vehicle_id) {
          return event;
        }
      }

      return event;
    });

    let allEvents = [...enrichedFeedEvents];

    // Merge AI alerts into feed if filter includes 'ai_alert' or 'all'
    if ((selectedFilters.includes('ai_alert') || selectedFilters.includes('all')) && alerts.length > 0) {
      const alertEvents = alerts.map(alert => ({
        id: alert.id,
        kind: 'ai_alert' as const,
        event_time: alert.created_at,
        priority: alert.severity === 'high' ? 'danger' as const : alert.severity === 'medium' ? 'warn' as const : 'info' as const,
        title: alert.title,
        description: alert.description,
        entity_json: alert,
        status: alert.status,
        metadata: alert.metadata || {},
        organization_id: null
      }));

      allEvents = [...allEvents, ...alertEvents];
    }

    // Merge KPI cards into feed if filter includes 'kpi' or 'all'
    if ((selectedFilters.includes('kpi') || selectedFilters.includes('all')) && kpiCards) {
      const kpiEvents = kpiCards.map(kpi => ({
        id: kpi.id,
        kind: 'kpi' as const,
        event_time: kpi.computed_at,
        priority: 'info' as const,
        title: kpi.kpi_title,
        description: `${kpi.kpi_value_human} - ${kpi.kpi_payload.period || ''}`,
        entity_json: kpi.kpi_payload,
        status: 'active' as const,
        metadata: { theme: kpi.theme },
        kpi_data: kpi, // Store full KPI data
        organization_id: kpi.organization_id
      }));

      allEvents = [...allEvents, ...kpiEvents];
    }

    // Debug logging for document events
    const documentEvents = allEvents.filter(e => e.kind === 'vehicle_doc');
    if (documentEvents.length > 0) {
      console.log('📄 Document Events Before Filtering:', documentEvents.length, {
        includeDocuments,
        showFutureEvents,
        sample: documentEvents[0]
      });
    }

    // Filter out future events if toggle is off
    if (!showFutureEvents) {
      const now = new Date();
      allEvents = allEvents.filter(event => {
        // For events with scheduled_date or expiry_date in entity_json, check if they're in the future
        const eventTime = new Date(event.event_time);
        const scheduledDate = event.entity_json?.scheduled_date ? new Date(event.entity_json.scheduled_date) : null;
        const expiryDate = event.entity_json?.expiry_date ? new Date(event.entity_json.expiry_date) : null;
        const endDate = event.entity_json?.end_date ? new Date(event.entity_json.end_date) : null;

        // Special handling for document reminders (vehicle_doc)
        // When "Show Future Events" is OFF, hide documents with distant future expiry dates
        // This prevents documents expiring in 2026, 2027, 2028 from appearing at the top
        // But allow documents expiring soon (within 90 days) to always show
        if (event.kind === 'vehicle_doc') {
          // Always filter by event_time first
          if (eventTime > now) {
            console.log('📄 Filtering out document (future event_time):', {
              title: event.title,
              event_time: event.event_time,
              expiry_date: expiryDate
            });
            return false;
          }

          // If expiry date is more than 90 days in the future, hide it
          // This filters out documents expiring in 2026, 2027, 2028
          // But allows imminent expiries (within 3 months) to show
          if (expiryDate) {
            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const isDistantFuture = daysUntilExpiry > 90;

            if (isDistantFuture) {
              console.log('📄 Filtering out document (distant future expiry):', {
                title: event.title,
                expiry_date: expiryDate,
                days_until_expiry: daysUntilExpiry
              });
              return false;
            }
          }

          return true; // Show documents expiring soon or in the past
        }

        // Keep events where event_time (activity timestamp) is in the past
        // This ensures recently created/viewed items always show
        if (eventTime <= now) {
          return true;
        }

        // Filter out other event types with future scheduled dates or end dates
        if (scheduledDate && scheduledDate > now) {
          return false;
        }
        if (endDate && endDate > now) {
          return false;
        }

        return true;
      });

      // Log how many documents passed the filter
      const remainingDocs = allEvents.filter(e => e.kind === 'vehicle_doc');
      if (documentEvents.length > 0) {
        console.log('📄 Document Events After Filtering:', remainingDocs.length, `(${documentEvents.length - remainingDocs.length} filtered out)`);
      }
    } else {
      // When showFutureEvents is ON, all events pass through (including documents)
      console.log('📄 Show Future Events is ON - No filtering applied');
      console.log('📄 Total documents in feed:', documentEvents.length);
    }

    // Sort all events by event_time descending
    return allEvents.sort((a, b) =>
      new Date(b.event_time).getTime() - new Date(a.event_time).getTime()
    );
  }, [heroFeedData, kpiCards, selectedFilters, alerts, trips, maintenanceTasksData, showFutureEvents]);

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
      {/* Compact Header with Fleet Activity */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-4">
        {/* Title Row with Refresh Button */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg">
              <Home className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Fleet Activity</h1>
              <p className="text-xs text-gray-600 mt-0.5">Real-time updates from your fleet</p>
            </div>
          </div>
          <button
            onClick={() => {
              refetchHeroFeed();
              refetchDrivers();
              refetchVehicles();
              refetchKPIs();
              refetchShorts();
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh feed"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Tab Navigation Row */}
        <div className="flex gap-2 px-4 py-2">
          <button
            onClick={() => setActiveTab('all-feed')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium
              ${activeTab === 'all-feed'
                ? 'bg-primary-50 text-primary-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }
            `}
          >
            <Home className="w-4 h-4" />
            <span>All Feed</span>
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium
              ${activeTab === 'alerts'
                ? 'bg-primary-50 text-primary-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }
            `}
          >
            <Bell className="w-4 h-4" />
            <span>AI Alerts</span>
          </button>
          <button
            onClick={() => setActiveTab('driver-insights')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium
              ${activeTab === 'driver-insights'
                ? 'bg-primary-50 text-primary-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }
            `}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Driver Insights</span>
          </button>
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
            <div className="space-y-4">
              {/* Hero Feed Content */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {/* Compact Filter Row with Integrated Counts */}
                <div className="p-3">
                  {/* Filter Badges with Counts */}
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <button
                      onClick={() => {
                        if (!selectedFilters.includes('ai_alert')) {
                          setSelectedFilters(prev => prev.includes('all') ? ['ai_alert'] : [...prev, 'ai_alert']);
                        } else {
                          setSelectedFilters(prev => prev.filter(f => f !== 'ai_alert'));
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedFilters.includes('ai_alert') || selectedFilters.includes('all')
                          ? 'bg-red-100 text-red-700 border border-red-300'
                          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>AI Alerts ({events.filter(e => e.kind === 'ai_alert').length})</span>
                    </button>

                    <button
                      onClick={() => {
                        if (!selectedFilters.includes('vehicle_doc')) {
                          setSelectedFilters(prev => prev.includes('all') ? ['vehicle_doc'] : [...prev, 'vehicle_doc']);
                        } else {
                          setSelectedFilters(prev => prev.filter(f => f !== 'vehicle_doc'));
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedFilters.includes('vehicle_doc') || selectedFilters.includes('all')
                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Documents ({events.filter(e => e.kind === 'vehicle_doc').length})</span>
                    </button>

                    <button
                      onClick={() => {
                        if (!selectedFilters.includes('maintenance')) {
                          setSelectedFilters(prev => prev.includes('all') ? ['maintenance'] : [...prev, 'maintenance']);
                        } else {
                          setSelectedFilters(prev => prev.filter(f => f !== 'maintenance'));
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedFilters.includes('maintenance') || selectedFilters.includes('all')
                          ? 'bg-orange-100 text-orange-700 border border-orange-300'
                          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <Tool className="w-3.5 h-3.5" />
                      <span>Maintenance ({events.filter(e => e.kind === 'maintenance').length})</span>
                    </button>

                    <button
                      onClick={() => {
                        if (!selectedFilters.includes('trip')) {
                          setSelectedFilters(prev => prev.includes('all') ? ['trip'] : [...prev, 'trip']);
                        } else {
                          setSelectedFilters(prev => prev.filter(f => f !== 'trip'));
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedFilters.includes('trip') || selectedFilters.includes('all')
                          ? 'bg-green-100 text-green-700 border border-green-300'
                          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Trips ({events.filter(e => e.kind === 'trip').length})</span>
                    </button>

                    <button
                      onClick={() => {
                        if (!selectedFilters.includes('kpi')) {
                          setSelectedFilters(prev => prev.includes('all') ? ['kpi'] : [...prev, 'kpi']);
                        } else {
                          setSelectedFilters(prev => prev.filter(f => f !== 'kpi'));
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedFilters.includes('kpi') || selectedFilters.includes('all')
                          ? 'bg-purple-100 text-purple-700 border border-purple-300'
                          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <BarChart2 className="w-3.5 h-3.5" />
                      <span>KPIs ({kpiCards?.length || 0})</span>
                    </button>

                    <button
                      onClick={toggleVideos}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        showVideos
                          ? 'bg-pink-100 text-pink-700 border border-pink-300'
                          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                      title={showVideos ? 'Hide video reels' : 'Show video reels'}
                    >
                      {showVideos ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                      <span>Videos ({availableShorts.length})</span>
                    </button>

                    {/* Compact Document Reminders Toggle */}
                    <div className="ml-auto flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-xs text-gray-600 font-medium">Show Doc Reminders</span>
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={includeDocuments}
                            onChange={(e) => setIncludeDocuments(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </div>
                      </label>

                      {/* Future Events Toggle */}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-xs text-gray-600 font-medium">Show Future Events</span>
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={showFutureEvents}
                            onChange={(e) => {
                              const newValue = e.target.checked;
                              setShowFutureEvents(newValue);
                              localStorage.setItem('showFutureEvents', JSON.stringify(newValue));
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Social Media Scroller Layout */}
                <div className="max-w-4xl mx-auto px-3 pb-3">

                  {/* Social Media Scroller */}
                  <div
                    ref={feedContainerRef}
                    className="space-y-3 overflow-y-auto max-h-[60vh] sm:max-h-[70vh] md:max-h-[75vh] pr-1"
                  >
                    {heroFeedLoading ? (
                      <div className="text-center py-8">
                        <RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin text-primary-600" />
                        <p className="text-gray-500">Loading feed...</p>
                      </div>
                    ) : (
                      <>
                        {events.length > 0 ? (
                          <>
                            {events.map((event, index) => {
                              // Intersperse videos: After first 3 cards, then every 3-4 cards
                              // Pattern: 3 cards → video → 3 cards → video → 4 cards → video...
                              let shouldShowVideo = false;
                              let videoIndex = 0;

                              if (showVideos && availableShorts.length > 0) {
                                // Show first video after 3 info cards
                                if (index === 3) {
                                  shouldShowVideo = true;
                                  videoIndex = 0;
                                }
                                // Then alternate between every 3 and 4 cards
                                else if (index > 3) {
                                  const adjustedIndex = index - 3; // Offset by first 3 cards
                                  // After index 3, show video every 3-4 cards
                                  // Pattern: 3 cards (index 4,5,6) → video → 4 cards (index 8,9,10,11) → video → 3 cards...
                                  const cycle = Math.floor(adjustedIndex / 7); // Each cycle is 3 cards + video + 3 cards
                                  const positionInCycle = adjustedIndex % 7;

                                  if (positionInCycle === 3) {
                                    shouldShowVideo = true;
                                    videoIndex = (cycle + 1) % availableShorts.length;
                                  }
                                }
                              }

                              const short = availableShorts[videoIndex];

                              // Get driver and vehicle data for this event
                              const tripData = event.entity_json;

                              // Try to get vehicle and driver from multiple sources
                              let vehicleData = null;
                              let driverData = null;

                              // For AI alerts, get vehicle/driver from metadata or affected_entity
                              if (event.kind === 'ai_alert') {
                                const alertData = event.entity_json || {};
                                const metadata = alertData.metadata || {};
                                const affectedEntity = alertData.affected_entity;

                                // Get vehicle ID from metadata or affected_entity
                                const vehicleId = metadata.vehicle_id || (affectedEntity?.type === 'vehicle' ? affectedEntity.id : null);
                                if (vehicleId) {
                                  vehicleData = vehiclesMap ? vehiclesMap[vehicleId] : null;
                                  if (!vehicleData) {
                                    const foundVehicle = vehicles.find(v => v.id === vehicleId);
                                    if (foundVehicle) {
                                      vehicleData = {
                                        ...foundVehicle,
                                        photo_url: foundVehicle.vehicle_photo_url || foundVehicle.photo_url
                                      };
                                    }
                                  }
                                }

                                // Get driver ID from metadata or affected_entity
                                const driverId = metadata.driver_id || (affectedEntity?.type === 'driver' ? affectedEntity.id : null);
                                if (driverId) {
                                  driverData = driversMap ? driversMap[driverId] : null;
                                  if (!driverData) {
                                    const foundDriver = drivers.find(d => d.id === driverId);
                                    if (foundDriver) {
                                      driverData = {
                                        ...foundDriver,
                                        photo_url: foundDriver.driver_photo_url || foundDriver.photo_url
                                      };
                                    }
                                  }
                                }
                              }

                              // For trips, get vehicle and driver from trip data
                              if (tripData?.vehicle_id) {
                                // First try vehiclesMap (which has photo_url already processed)
                                vehicleData = vehiclesMap ? vehiclesMap[tripData.vehicle_id] : null;
                                // Fallback to vehicles array
                                if (!vehicleData) {
                                  const foundVehicle = vehicles.find(v => v.id === tripData.vehicle_id);
                                  if (foundVehicle) {
                                    // Ensure photo_url is set
                                    vehicleData = {
                                      ...foundVehicle,
                                      photo_url: foundVehicle.vehicle_photo_url || foundVehicle.photo_url
                                    };
                                  }
                                }

                                if (config.isDev && event.kind === 'trip' && index === 0) {
                                  console.log('Trip vehicle_id:', tripData.vehicle_id);
                                  console.log('Found vehicleData:', vehicleData);
                                  console.log('Vehicle photo_url:', vehicleData?.photo_url);
                                  console.log('VehiclesMap sample:', vehiclesMap && Object.values(vehiclesMap)[0]);
                                }
                              }

                              if (tripData?.driver_id) {
                                // First try driversMap (which has photo_url already processed)
                                driverData = driversMap ? driversMap[tripData.driver_id] : null;
                                // Fallback to drivers array
                                if (!driverData) {
                                  const foundDriver = drivers.find(d => d.id === tripData.driver_id);
                                  if (foundDriver) {
                                    // Ensure photo_url is set from driver_photo_url
                                    driverData = {
                                      ...foundDriver,
                                      photo_url: foundDriver.driver_photo_url || foundDriver.photo_url
                                    };
                                  }
                                }

                                if (config.isDev && event.kind === 'trip' && index === 0) {
                                  console.log('Trip driver_id:', tripData.driver_id);
                                  console.log('Found driverData:', driverData);
                                  console.log('Driver photo_url:', driverData?.photo_url);
                                  console.log('Driver driver_photo_url:', driverData?.driver_photo_url);
                                  console.log('DriversMap sample:', driversMap && Object.values(driversMap)[0]);
                                }
                              }

                              if (event.kind === 'maintenance') {
                                const maintenanceEntity = event.entity_json || {};

                                const maintenanceVehicleId =
                                  maintenanceEntity.vehicle_id ||
                                  maintenanceEntity.vehicleId ||
                                  maintenanceEntity.vehicle?.id ||
                                  maintenanceEntity.vehicle?.vehicle_id ||
                                  maintenanceEntity.vehicle?.vehicleId;

                                if (maintenanceVehicleId && !vehicleData) {
                                  vehicleData =
                                    (vehiclesMap ? vehiclesMap[maintenanceVehicleId] : null) ||
                                    vehicleMap[maintenanceVehicleId] ||
                                    vehicles.find(v => v.id === maintenanceVehicleId) ||
                                    null;
                                }

                                const maintenanceDriverId =
                                  maintenanceEntity.driver_id ||
                                  maintenanceEntity.driverId ||
                                  maintenanceEntity.assigned_driver_id ||
                                  maintenanceEntity.assignedDriverId ||
                                  maintenanceEntity.driver?.id ||
                                  maintenanceEntity.assigned_driver?.id ||
                                  maintenanceEntity.vehicle?.assigned_driver_id ||
                                  maintenanceEntity.vehicle?.driver_id ||
                                  maintenanceEntity.vehicle?.driverId;

                                if (maintenanceDriverId && !driverData) {
                                  driverData =
                                    (driversMap ? driversMap[maintenanceDriverId] : null) ||
                                    drivers.find(d => d.id === maintenanceDriverId) ||
                                    null;

                                  if (!driverData) {
                                    const fallbackName =
                                      maintenanceEntity.driver_name ||
                                      maintenanceEntity.assigned_driver_name ||
                                      maintenanceEntity.assigned_driver?.name ||
                                      maintenanceEntity.driver?.name ||
                                      vehicleData?.assigned_driver_name ||
                                      vehicleData?.driver_name;

                                    if (fallbackName) {
                                      driverData = {
                                        id: maintenanceDriverId,
                                        name: fallbackName,
                                        photo_url:
                                          maintenanceEntity.driver_photo_url ||
                                          maintenanceEntity.assigned_driver?.photo_url ||
                                          maintenanceEntity.driver?.photo_url ||
                                          null
                                      };
                                    }
                                  }
                                } else if (!driverData) {
                                  const fallbackName =
                                    maintenanceEntity.driver_name ||
                                    maintenanceEntity.assigned_driver_name ||
                                    maintenanceEntity.assigned_driver?.name ||
                                    maintenanceEntity.driver?.name ||
                                    vehicleData?.assigned_driver_name ||
                                    vehicleData?.driver_name;

                                  if (fallbackName) {
                                    driverData = {
                                      name: fallbackName,
                                      photo_url:
                                        maintenanceEntity.driver_photo_url ||
                                        maintenanceEntity.assigned_driver?.photo_url ||
                                        maintenanceEntity.driver?.photo_url ||
                                        vehicleData?.driver_photo_url ||
                                        vehicleData?.photo_url ||
                                        null
                                    };
                                  }
                                }

                                if (!driverData && vehicleData?.primary_driver_id) {
                                  driverData =
                                    (driversMap ? driversMap[vehicleData.primary_driver_id] : null) ||
                                    drivers.find(d => d.id === vehicleData.primary_driver_id) ||
                                    null;
                                }
                              }

                              return (
                                <React.Fragment key={`fragment-${event.id}`}>
                                  {shouldShowVideo && (
                                    <YouTubeVideoCard
                                      key={`video-${short.id}`}
                                      short={short}
                                      index={videoIndex}
                                    />
                                  )}

                                  {/* KPI Card - Special handling */}
                                  {event.kind === 'kpi' && event.kpi_data ? (
                                    <KPICard
                                      key={`kpi-${event.id}`}
                                      kpi={event.kpi_data}
                                      variant="full"
                                    />
                                  ) : event.kind === 'trip' && event.entity_json ? (
                                    /* Trip Card - Use the same card as trips page */
                                    <TripCard
                                      key={`trip-${event.id}`}
                                      trip={event.entity_json as Trip}
                                      vehicle={vehicleData}
                                      driver={driverData}
                                      onClick={() => {
                                        // Navigate to trip details if needed
                                        if (event.entity_json?.id) {
                                          window.location.href = `/trips/${event.entity_json.id}`;
                                        }
                                      }}
                                    />
                                  ) : (
                                    /* Enhanced Feed Card for other events */
                                    <EnhancedFeedCard
                                      key={`${event.id}-${index}`}
                                      event={event}
                                      vehicleData={vehicleData}
                                      driverData={driverData}
                                      onAction={handleAction}
                                    />
                                  )}
                                </React.Fragment>
                              );
                            })}
                            
                            {hasNextPage && (
                              <div ref={loadMoreRef} className="text-center pt-4">
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
