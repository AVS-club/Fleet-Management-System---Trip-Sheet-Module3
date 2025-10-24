import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertCircle, TrendingUp, TrendingDown, DollarSign, Wrench,
  Truck, User, FileText, Calendar, Play, Volume2, VolumeX,
  Heart, MessageCircle, Share2, Filter, ChevronDown, Bell,
  Activity, Package, MapPin, Fuel, Clock, CheckCircle, XCircle
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { supabase } from '@/utils/supabaseClient';
import { useYouTubeShortsUnified } from '@/hooks/useYouTubeShortsUnified';
import { format, formatDistanceToNow, isAfter, isBefore, startOfDay } from 'date-fns';

// Helper components to replace missing UI imports
const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
    {children}
  </div>
);

const Badge: React.FC<{ className?: string; variant?: string; children: React.ReactNode; onClick?: () => void }> = ({
  className = '',
  variant = 'default',
  children,
  onClick
}) => {
  const variantClasses = {
    default: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    destructive: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
    secondary: 'bg-gray-100 text-gray-800',
    outline: 'border border-gray-300 text-gray-700'
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant as keyof typeof variantClasses] || variantClasses.default} ${className}`}
      onClick={onClick}
    >
      {children}
    </span>
  );
};

// Types for unified timeline
interface TimelineItem {
  id: string;
  type: 'trip' | 'maintenance' | 'driver' | 'vehicle' | 'reminder' | 'youtube' | 'fuel' | 'expense';
  timestamp: Date;
  priority?: 'high' | 'medium' | 'low';
  data: any;
}

interface FilterState {
  types: string[];
  dateRange: 'today' | 'week' | 'month' | 'all';
  showVideos: boolean;
}

export default function UnifiedAIAlertsPage() {
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    types: ['all'],
    dateRange: 'all',
    showVideos: true
  });
  const [showFilters, setShowFilters] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [playingVideos, setPlayingVideos] = useState<Set<string>>(new Set());

  // YouTube integration
  const { shorts, loading: videosLoading } = useYouTubeShortsUnified();

  // Fetch all data and merge into timeline
  const fetchTimelineData = useCallback(async () => {
    try {
      setLoading(true);

      const now = new Date();
      const startDate = getDateRangeStart(filters.dateRange);

      // Fetch all data sources in parallel
      const [trips, maintenance, vehicles, drivers, reminders, fuel, expenses] = await Promise.all([
        fetchTrips(startDate),
        fetchMaintenance(startDate),
        fetchVehicles(startDate),
        fetchDrivers(startDate),
        fetchReminders(),
        fetchFuelEntries(startDate),
        fetchExpenses(startDate)
      ]);

      // Merge all items into unified timeline
      let allItems: TimelineItem[] = [
        ...trips,
        ...maintenance,
        ...vehicles,
        ...drivers,
        ...reminders,
        ...fuel,
        ...expenses
      ];

      // Filter by type if needed
      if (!filters.types.includes('all')) {
        allItems = allItems.filter(item => filters.types.includes(item.type));
      }

      // Sort by timestamp (newest first)
      allItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Integrate YouTube videos if enabled
      if (filters.showVideos && shorts.length > 0) {
        allItems = integrateYouTubeVideos(allItems, shorts);
      }

      setTimelineItems(allItems);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, shorts]);

  // Helper functions for fetching different data types
  const fetchTrips = async (startDate: Date) => {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(trip => ({
      id: `trip-${trip.id}`,
      type: 'trip' as const,
      timestamp: new Date(trip.created_at),
      priority: trip.profit_status === 'loss' ? 'high' : 'medium',
      data: trip
    }));
  };

  const fetchMaintenance = async (startDate: Date) => {
    const { data, error } = await supabase
      .from('maintenance_tasks')
      .select('*, vehicles(registration_number)')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(task => ({
      id: `maintenance-${task.id}`,
      type: 'maintenance' as const,
      timestamp: new Date(task.created_at),
      priority: task.priority,
      data: task
    }));
  };

  const fetchVehicles = async (startDate: Date) => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(vehicle => ({
      id: `vehicle-${vehicle.id}`,
      type: 'vehicle' as const,
      timestamp: new Date(vehicle.created_at),
      data: vehicle
    }));
  };

  const fetchDrivers = async (startDate: Date) => {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(driver => ({
      id: `driver-${driver.id}`,
      type: 'driver' as const,
      timestamp: new Date(driver.created_at),
      data: driver
    }));
  };

  const fetchReminders = async () => {
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('*');

    const reminders: TimelineItem[] = [];
    const now = new Date();

    vehicles?.forEach(vehicle => {
      // Check each document expiry
      const docs = [
        { type: 'insurance', date: vehicle.insurance_end_date, label: 'Insurance' },
        { type: 'fitness', date: vehicle.fitness_expiry_date, label: 'Fitness' },
        { type: 'permit', date: vehicle.permit_expiry_date, label: 'Permit' },
        { type: 'puc', date: vehicle.puc_expiry_date, label: 'PUC' },
        { type: 'tax', date: vehicle.tax_expiry_date, label: 'Tax' }
      ];

      docs.forEach(doc => {
        if (doc.date) {
          const expiryDate = new Date(doc.date);
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (daysUntilExpiry <= 30) {
            reminders.push({
              id: `reminder-${vehicle.id}-${doc.type}`,
              type: 'reminder',
              timestamp: expiryDate,
              priority: daysUntilExpiry <= 7 ? 'high' : 'medium',
              data: {
                vehicle_id: vehicle.id,
                registration: vehicle.registration_number,
                document_type: doc.label,
                expiry_date: doc.date,
                days_remaining: daysUntilExpiry
              }
            });
          }
        }
      });
    });

    return reminders;
  };

  const fetchFuelEntries = async (startDate: Date) => {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .not('fuel_litres', 'is', null)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(entry => ({
      id: `fuel-${entry.id}`,
      type: 'fuel' as const,
      timestamp: new Date(entry.created_at),
      data: entry
    }));
  };

  const fetchExpenses = async (startDate: Date) => {
    const { data, error} = await supabase
      .from('trips')
      .select('*')
      .gt('total_expense', 0)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(expense => ({
      id: `expense-${expense.id}`,
      type: 'expense' as const,
      timestamp: new Date(expense.created_at),
      data: expense
    }));
  };

  // Integrate YouTube videos into timeline
  const integrateYouTubeVideos = (items: TimelineItem[], videos: any[]) => {
    const result: TimelineItem[] = [];
    let videoIndex = 0;

    items.forEach((item, index) => {
      result.push(item);

      // Add video every 3-4 items
      if ((index + 1) % 4 === 0 && videoIndex < videos.length) {
        result.push({
          id: `youtube-${videos[videoIndex].id}`,
          type: 'youtube',
          timestamp: new Date(), // Use current time for videos
          data: videos[videoIndex]
        });
        videoIndex++;
      }
    });

    return result;
  };

  const getDateRangeStart = (range: string): Date => {
    const now = new Date();
    switch (range) {
      case 'today':
        return startOfDay(now);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }
  };

  // Render different timeline item types
  const renderTimelineItem = (item: TimelineItem) => {
    switch (item.type) {
      case 'trip':
        return <TripCard item={item} />;
      case 'maintenance':
        return <MaintenanceCard item={item} />;
      case 'vehicle':
        return <VehicleCard item={item} />;
      case 'driver':
        return <DriverCard item={item} />;
      case 'reminder':
        return <ReminderCard item={item} />;
      case 'fuel':
        return <FuelCard item={item} />;
      case 'expense':
        return <ExpenseCard item={item} />;
      case 'youtube':
        return <YouTubeCard
          item={item}
          isPlaying={playingVideos.has(item.id)}
          onPlayToggle={() => toggleVideoPlay(item.id)}
        />;
      default:
        return null;
    }
  };

  const toggleVideoPlay = (videoId: string) => {
    setPlayingVideos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  };

  // Setup intersection observer for auto-play
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const videoId = entry.target.getAttribute('data-video-id');
          if (videoId && entry.isIntersecting) {
            setPlayingVideos(prev => new Set(prev).add(videoId));
          }
        });
      },
      { threshold: 0.5 }
    );

    // Observe all video elements
    document.querySelectorAll('[data-video-id]').forEach(element => {
      observerRef.current?.observe(element);
    });

    return () => observerRef.current?.disconnect();
  }, [timelineItems]);

  useEffect(() => {
    fetchTimelineData();
  }, [fetchTimelineData]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Mobile-optimized Header */}
      <div className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Fleet Feed</h1>
              <p className="text-xs text-gray-500">Real-time fleet activity</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-1"
            >
              <Filter className="h-4 w-4" />
              <ChevronDown className={`h-3 w-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Collapsible Filters */}
        {showFilters && (
          <div className="border-t px-4 py-3 space-y-3 bg-gray-50 dark:bg-gray-900">
            {/* Date Range */}
            <div className="flex gap-2">
              {['today', 'week', 'month', 'all'].map(range => (
                <Button
                  key={range}
                  size="sm"
                  variant={filters.dateRange === range ? 'default' : 'outline'}
                  onClick={() => setFilters(prev => ({ ...prev, dateRange: range as any }))}
                  className="flex-1 capitalize text-xs"
                >
                  {range === 'all' ? 'All Time' : range}
                </Button>
              ))}
            </div>

            {/* Type Filters */}
            <div className="flex flex-wrap gap-2">
              <Badge
                className={`cursor-pointer ${filters.types.includes('all') ? 'bg-blue-500' : 'bg-gray-200'}`}
                onClick={() => setFilters(prev => ({ ...prev, types: ['all'] }))}
              >
                All
              </Badge>
              {['trip', 'maintenance', 'vehicle', 'driver', 'reminder', 'fuel'].map(type => (
                <Badge
                  key={type}
                  className={`cursor-pointer capitalize ${
                    filters.types.includes(type) ? 'bg-blue-500' : 'bg-gray-200'
                  }`}
                  onClick={() => {
                    setFilters(prev => ({
                      ...prev,
                      types: prev.types.includes(type)
                        ? prev.types.filter(t => t !== type)
                        : [...prev.types.filter(t => t !== 'all'), type]
                    }));
                  }}
                >
                  {type}
                </Badge>
              ))}
            </div>

            {/* Video Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm">Fleet Tips Videos</span>
              <Button
                size="sm"
                variant={filters.showVideos ? 'default' : 'outline'}
                onClick={() => setFilters(prev => ({ ...prev, showVideos: !prev.showVideos }))}
              >
                {filters.showVideos ? 'ON' : 'OFF'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Timeline Feed */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 dark:bg-gray-700 h-32 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {timelineItems.length === 0 ? (
              <Card className="p-8 text-center">
                <Activity className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500">No activity to show</p>
                <p className="text-sm text-gray-400 mt-2">Adjust filters to see more</p>
              </Card>
            ) : (
              timelineItems.map(item => (
                <div key={item.id} className="animate-in slide-in-from-bottom duration-300">
                  {renderTimelineItem(item)}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Individual Card Components (Mobile-optimized)

const TripCard: React.FC<{ item: TimelineItem }> = ({ item }) => {
  const trip = item.data;
  const isProfitable = trip.profit_status === 'profit';

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-full ${isProfitable ? 'bg-green-100' : 'bg-red-100'}`}>
              <Truck className={`h-4 w-4 ${isProfitable ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <div>
              <p className="font-semibold text-sm">New Trip Added</p>
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(item.timestamp, { addSuffix: true })}
              </p>
            </div>
          </div>
          <Badge variant={isProfitable ? 'success' : 'destructive'}>
            {isProfitable ? '+' : '-'}₹{Math.abs(trip.net_profit || 0)}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-3 w-3 text-gray-400" />
            <span className="text-gray-600">{trip.from_location} → {trip.to_location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Distance:</span>
            <span className="font-medium">{trip.distance_km} km</span>
          </div>
          {trip.driver_name && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-3 w-3 text-gray-400" />
              <span>{trip.driver_name}</span>
            </div>
          )}
        </div>

        {trip.net_profit && (
          <div className={`mt-3 pt-3 border-t flex items-center justify-between text-sm ${
            isProfitable ? 'text-green-600' : 'text-red-600'
          }`}>
            <span>Net {isProfitable ? 'Profit' : 'Loss'}:</span>
            <span className="font-bold">₹{Math.abs(trip.net_profit)}</span>
          </div>
        )}
      </div>
    </Card>
  );
};

const MaintenanceCard: React.FC<{ item: TimelineItem }> = ({ item }) => {
  const task = item.data;
  const isHighPriority = task.priority === 'critical' || task.priority === 'high';

  return (
    <Card className={`overflow-hidden ${isHighPriority ? 'border-orange-400' : ''}`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-full ${isHighPriority ? 'bg-orange-100' : 'bg-blue-100'}`}>
              <Wrench className={`h-4 w-4 ${isHighPriority ? 'text-orange-600' : 'text-blue-600'}`} />
            </div>
            <div>
              <p className="font-semibold text-sm">Maintenance Task</p>
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(item.timestamp, { addSuffix: true })}
              </p>
            </div>
          </div>
          {task.priority && (
            <Badge variant={isHighPriority ? 'destructive' : 'default'}>
              {task.priority}
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{task.task_type}</p>
          {task.vehicles && (
            <div className="flex items-center gap-2 text-sm">
              <Truck className="h-3 w-3 text-gray-400" />
              <span>{task.vehicles.registration_number}</span>
            </div>
          )}
          {task.estimated_cost && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-3 w-3 text-gray-400" />
              <span>Est. Cost: ₹{task.estimated_cost}</span>
            </div>
          )}
          <Badge variant="outline" className="text-xs">
            {task.status || 'Pending'}
          </Badge>
        </div>
      </div>
    </Card>
  );
};

const VehicleCard: React.FC<{ item: TimelineItem }> = ({ item }) => {
  const vehicle = item.data;

  return (
    <Card className="overflow-hidden border-green-400">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-green-100">
              <Truck className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">New Vehicle Added</p>
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(item.timestamp, { addSuffix: true })}
              </p>
            </div>
          </div>
          <CheckCircle className="h-5 w-5 text-green-500" />
        </div>

        <div className="space-y-2">
          <p className="text-lg font-bold">{vehicle.registration_number}</p>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">{vehicle.make} {vehicle.model}</Badge>
            <Badge variant="outline">{vehicle.year}</Badge>
            <Badge variant="outline">{vehicle.fuel_type}</Badge>
          </div>
          <div className="text-sm text-gray-600">
            <span>Type: {vehicle.type}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

const DriverCard: React.FC<{ item: TimelineItem }> = ({ item }) => {
  const driver = item.data;

  return (
    <Card className="overflow-hidden border-blue-400">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-blue-100">
              <User className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">New Driver Added</p>
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(item.timestamp, { addSuffix: true })}
              </p>
            </div>
          </div>
          <Badge variant={driver.status === 'active' ? 'success' : 'secondary'}>
            {driver.status}
          </Badge>
        </div>

        <div className="space-y-2">
          <p className="text-lg font-bold">{driver.name}</p>
          <div className="text-sm text-gray-600 space-y-1">
            <p>License: {driver.license_number}</p>
            <p>Experience: {driver.experience_years} years</p>
            <p>Contact: {driver.contact_number}</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

const ReminderCard: React.FC<{ item: TimelineItem }> = ({ item }) => {
  const reminder = item.data;
  const isUrgent = reminder.days_remaining <= 7;

  return (
    <Card className={`overflow-hidden ${isUrgent ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-yellow-400'}`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-full ${isUrgent ? 'bg-red-100' : 'bg-yellow-100'}`}>
              <Bell className={`h-4 w-4 ${isUrgent ? 'text-red-600 animate-pulse' : 'text-yellow-600'}`} />
            </div>
            <div>
              <p className="font-semibold text-sm">{reminder.document_type} Expiring</p>
              <p className="text-xs text-gray-500">
                {reminder.days_remaining > 0
                  ? `${reminder.days_remaining} days remaining`
                  : 'Expired'}
              </p>
            </div>
          </div>
          <Badge variant={isUrgent ? 'destructive' : 'warning'}>
            {isUrgent ? 'Urgent' : 'Upcoming'}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Truck className="h-3 w-3 text-gray-400" />
            <span className="font-medium">{reminder.registration}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-3 w-3 text-gray-400" />
            <span>Expires: {format(new Date(reminder.expiry_date), 'dd MMM yyyy')}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

const FuelCard: React.FC<{ item: TimelineItem }> = ({ item }) => {
  const fuel = item.data;

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-purple-100">
              <Fuel className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">Fuel Entry</p>
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(item.timestamp, { addSuffix: true })}
              </p>
            </div>
          </div>
          <Badge variant="secondary">₹{fuel.total_fuel_cost || 0}</Badge>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Litres:</span>
            <span className="font-medium">{fuel.fuel_litres}L</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Rate:</span>
            <span className="font-medium">₹{fuel.fuel_rate}/L</span>
          </div>
          {fuel.calculated_kmpl && (
            <div className="flex justify-between">
              <span className="text-gray-500">Mileage:</span>
              <span className="font-medium">{fuel.calculated_kmpl} km/L</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

const ExpenseCard: React.FC<{ item: TimelineItem }> = ({ item }) => {
  const expense = item.data;

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-red-100">
              <DollarSign className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">Expense Recorded</p>
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(item.timestamp, { addSuffix: true })}
              </p>
            </div>
          </div>
          <Badge variant="destructive">₹{expense.total_expense}</Badge>
        </div>

        <div className="space-y-2 text-sm">
          {expense.toll_expense && (
            <div className="flex justify-between">
              <span className="text-gray-500">Toll:</span>
              <span>₹{expense.toll_expense}</span>
            </div>
          )}
          {expense.driver_expense && (
            <div className="flex justify-between">
              <span className="text-gray-500">Driver:</span>
              <span>₹{expense.driver_expense}</span>
            </div>
          )}
          {expense.miscellaneous_expense && (
            <div className="flex justify-between">
              <span className="text-gray-500">Misc:</span>
              <span>₹{expense.miscellaneous_expense}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

const YouTubeCard: React.FC<{
  item: TimelineItem,
  isPlaying: boolean,
  onPlayToggle: () => void
}> = ({ item, isPlaying, onPlayToggle }) => {
  const video = item.data;
  const [liked, setLiked] = useState(false);
  const [muted, setMuted] = useState(true);

  return (
    <Card className="overflow-hidden bg-black">
      <div className="relative aspect-[9/16] max-h-[600px]">
        {/* Video Player */}
        <div
          className="absolute inset-0"
          data-video-id={item.id}
        >
          <iframe
            src={`https://www.youtube.com/embed/${video.id}?autoplay=${isPlaying ? 1 : 0}&mute=${muted ? 1 : 0}&controls=0&playsinline=1&loop=1&playlist=${video.id}`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Overlay Controls */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70 pointer-events-none" />

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4">
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-600 text-white">
              <Play className="h-3 w-3 mr-1" />
              Fleet Tips
            </Badge>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
          <div className="text-white">
            <p className="font-semibold text-sm line-clamp-2">{video.title}</p>
            <p className="text-xs text-gray-300 mt-1 line-clamp-2">{video.description}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
                onClick={() => setLiked(!liked)}
              >
                <Heart className={`h-5 w-5 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
              >
                <MessageCircle className="h-5 w-5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
              >
                <Share2 className="h-5 w-5" />
              </Button>
            </div>

            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={() => setMuted(!muted)}
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Play/Pause Overlay */}
        {!isPlaying && (
          <button
            className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity"
            onClick={onPlayToggle}
          >
            <div className="p-4 rounded-full bg-white/90">
              <Play className="h-8 w-8 text-black" />
            </div>
          </button>
        )}
      </div>
    </Card>
  );
};
