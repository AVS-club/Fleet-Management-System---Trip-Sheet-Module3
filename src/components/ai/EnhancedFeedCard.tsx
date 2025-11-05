import React from 'react';
import {
  AlertTriangle,
  Truck,
  Wrench,
  FileText,
  TrendingUp,
  Bell,
  Calendar,
  MapPin,
  Fuel,
  DollarSign,
  TrendingDown,
  User,
  Activity,
  Navigation,
  Clock,
  CheckCircle,
  XCircle,
  Image,
  Store,
  ClipboardList
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface FeedCardProps {
  event: any;
  onAction?: (alert: any, action: 'accept' | 'deny' | 'ignore') => void;
  vehicleData?: any;
  driverData?: any;
}

export default function EnhancedFeedCard({ event, onAction, vehicleData, driverData }: FeedCardProps) {
  const isTrip = event.kind === 'trip';
  const isAIAlert = event.kind === 'ai_alert';
  const tripData = isTrip ? event.entity_json : null;

  // Get event icon based on type and priority
  const getEventIcon = (kind: string, priority?: string) => {
    const iconClass = `h-5 w-5 ${
      priority === 'danger' ? 'text-red-500' :
      priority === 'warn' ? 'text-yellow-500' :
      'text-blue-500'
    }`;

    switch (kind) {
      case 'ai_alert': return <AlertTriangle className={iconClass} />;
      case 'trip': return <Truck className={iconClass} />;
      case 'maintenance': return <Wrench className={iconClass} />;
      case 'vehicle_doc': return <FileText className={iconClass} />;
      case 'kpi': return <TrendingUp className={iconClass} />;
      default: return <Bell className={iconClass} />;
    }
  };

  // Format currency with Indian locale
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getFileNameFromUrl = (url?: string) => {
    if (!url || typeof url !== 'string') return 'Attachment';
    try {
      const withoutQuery = url.split('?')[0];
      const segments = withoutQuery.split('/').filter(Boolean);
      const fileName = segments[segments.length - 1] || 'Attachment';
      return decodeURIComponent(fileName);
    } catch {
      return 'Attachment';
    }
  };

  // Humanize labels like wear_and_tear_replacement_repairs → Wear And Tear Replacement Repairs
  const toTitleFromSnake = (value?: string) => {
    if (!value || typeof value !== 'string') return '';
    return value
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Extract actual value from KPI payload when kpi_value_human contains hash marks
  const extractKPIValue = (valueHuman: string, payload: any) => {
    // Check if value contains hash marks (e.g., "₹#.#L" or "#,###km")
    if (!valueHuman.includes('#')) {
      return valueHuman; // No hash marks, return as-is
    }

    // Try to extract value from payload
    if (payload && typeof payload === 'object') {
      const value = payload.value;
      const unit = payload.unit || '';

      if (typeof value === 'number') {
        // Format large numbers with Indian locale
        const formattedValue = value.toLocaleString('en-IN');

        // Handle currency
        if (unit === '₹' || valueHuman.includes('₹')) {
          return `₹${formattedValue}`;
        }

        // Handle other units
        return `${formattedValue}${unit}`;
      }
    }

    // Fallback: return original with indication that data is hidden
    return valueHuman.replace(/#[,#.]+/g, '[hidden]');
  };

  // Enhanced maintenance card
  const isMaintenance = event.kind === 'maintenance';
  const maintenanceData = isMaintenance ? event.entity_json : null;
  const estimatedCostValue = maintenanceData
    ? maintenanceData.cost ?? maintenanceData.estimated_cost ?? maintenanceData.actual_cost
    : null;
  const maintenanceContainerClass =
    event.priority === 'danger'
      ? 'border-red-300 bg-red-50/80 dark:border-red-800 dark:bg-red-950/40'
      : event.priority === 'warn'
      ? 'border-amber-300 bg-amber-50/70 dark:border-amber-700 dark:bg-amber-900/30'
      : 'border-blue-200 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-900/30';

  const maintenanceIconAccent =
    event.priority === 'danger'
      ? 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-200'
      : event.priority === 'warn'
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200'
      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200';

  const maintenanceFiles = React.useMemo(() => {
    if (!maintenanceData) return [] as Array<{ url: string; label: string; type: 'image' | 'pdf' }>;

    const files: Array<{ url: string; label: string; type: 'image' | 'pdf' }> = [];
    const seen = new Set<string>();
    const addFile = (url?: string, label?: string) => {
      if (!url || typeof url !== 'string') return;
      const trimmed = url.trim();
      if (!trimmed || seen.has(trimmed)) return;
      seen.add(trimmed);
      const isPdf = /\.pdf(\?|$)/i.test(trimmed);
      files.push({
        url: trimmed,
        label: label || getFileNameFromUrl(trimmed),
        type: isPdf ? 'pdf' : 'image'
      });
    };

    addFile(maintenanceData.odometer_image, 'Odometer Reading');

    maintenanceData.attachments?.forEach((url: string, index: number) =>
      addFile(url, `Attachment ${index + 1}`)
    );

    maintenanceData.bills?.forEach((bill: any, index: number) =>
      addFile(bill?.bill_image, bill?.description || `Bill ${index + 1}`)
    );

    maintenanceData.service_groups?.forEach((group: any, groupIndex: number) => {
      group?.bill_url?.forEach((url: string, index: number) =>
        addFile(
          url,
          group?.tasks?.[index]
            ? `${toTitleFromSnake(group.tasks[index])} Bill`
            : `Service Bill ${groupIndex + 1}-${index + 1}`
        )
      );
      group?.battery_waranty_url?.forEach((url: string) => addFile(url, 'Battery Warranty'));
      group?.tyre_waranty_url?.forEach((url: string) => addFile(url, 'Tyre Warranty'));
    });

    return files.slice(0, 4);
  }, [maintenanceData]);

  const primaryServiceGroup = React.useMemo(() => {
    if (!maintenanceData || !Array.isArray(maintenanceData.service_groups)) return null;
    if (maintenanceData.service_groups.length === 0) return null;
    return maintenanceData.service_groups[0];
  }, [maintenanceData]);

  const maintenanceTypeLabel = React.useMemo(() => {
    if (!maintenanceData) return null;
    if (maintenanceData.maintenanceType) {
      return toTitleFromSnake(maintenanceData.maintenanceType);
    }
    if (maintenanceData.maintenance_type) {
      return toTitleFromSnake(maintenanceData.maintenance_type);
    }
    if (maintenanceData.task_type) {
      return toTitleFromSnake(maintenanceData.task_type);
    }
    if (maintenanceData.category) {
      return toTitleFromSnake(maintenanceData.category);
    }
    return null;
  }, [maintenanceData]);

  const serviceModeLabel = React.useMemo(() => {
    if (!primaryServiceGroup && !maintenanceData) return null;
    const mode =
      primaryServiceGroup?.serviceType ||
      primaryServiceGroup?.service_type ||
      maintenanceData?.service_type ||
      maintenanceData?.serviceType ||
      maintenanceData?.service_mode ||
      maintenanceData?.serviceMode;
    if (!mode || typeof mode !== 'string') return null;
    return toTitleFromSnake(mode);
  }, [primaryServiceGroup, maintenanceData]);

  const garageName = React.useMemo(() => {
    if (!maintenanceData && !primaryServiceGroup) return null;
    const candidates = [
      maintenanceData?.garage_name,
      maintenanceData?.vendor_name,
      maintenanceData?.vendor,
      maintenanceData?.service_provider,
      maintenanceData?.serviceProvider,
      maintenanceData?.garage?.name,
      maintenanceData?.garage?.garage_name,
      maintenanceData?.garage?.vendor_name,
      primaryServiceGroup?.vendor_name,
      primaryServiceGroup?.vendor,
      primaryServiceGroup?.shop_name,
      primaryServiceGroup?.garage_name
    ];
    const found = candidates.find((value) => {
      if (!value) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      return false;
    });
    return typeof found === 'string' ? found : null;
  }, [maintenanceData, primaryServiceGroup]);

  const workSummary = React.useMemo(() => {
    if (maintenanceData?.work_done) {
      return maintenanceData.work_done;
    }
    if (!primaryServiceGroup && !maintenanceData) return null;
    const tasks = primaryServiceGroup?.tasks;
    const baseDescription =
      maintenanceData?.work_done ||
      maintenanceData?.service_description ||
      maintenanceData?.description ||
      maintenanceData?.summary ||
      maintenanceData?.service_summary;

    if (!tasks && !baseDescription) return null;

    const normalizedTasks = Array.isArray(tasks)
      ? tasks
          .map((task: any) => {
            if (!task) return null;
            if (typeof task === 'string') return toTitleFromSnake(task);
            if (typeof task === 'object') {
              return (
                task.name ||
                task.en ||
                task.hi ||
                Object.values(task).find((val) => typeof val === 'string')
              );
            }
            return null;
          })
          .filter((task): task is string => Boolean(task))
      : typeof tasks === 'string'
      ? [toTitleFromSnake(tasks)]
      : [];

    const taskSummary = normalizedTasks.length > 0 ? normalizedTasks.join(', ') : null;

    if (baseDescription && taskSummary) {
      return `${baseDescription} • ${taskSummary}`;
    }

    return baseDescription || taskSummary;
  }, [maintenanceData, primaryServiceGroup]);

  const assignedDriverName = React.useMemo(() => {
    if (driverData?.name) return driverData.name;
    if (maintenanceData?.driver_name) return maintenanceData.driver_name;
    if (maintenanceData?.assigned_driver_name) return maintenanceData.assigned_driver_name;
    if (maintenanceData?.assigned_driver?.name) return maintenanceData.assigned_driver.name;
    if (maintenanceData?.driver?.name) return maintenanceData.driver.name;
    if (maintenanceData?.vehicle?.driver_name) return maintenanceData.vehicle.driver_name;
    if (maintenanceData?.vehicle?.assigned_driver_name) return maintenanceData.vehicle.assigned_driver_name;
    if (maintenanceData?.vehicle?.assigned_driver?.name) return maintenanceData.vehicle.assigned_driver.name;
    return null;
  }, [driverData, maintenanceData]);

  const showCostSummaryCard =
    estimatedCostValue !== null &&
    estimatedCostValue !== undefined
      ? true
      : Boolean(garageName || maintenanceTypeLabel || workSummary || serviceModeLabel);

  if (isMaintenance && maintenanceData) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl border-2 p-6 shadow-md transition-all hover:shadow-lg ${maintenanceContainerClass}`}
      >
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white/60 to-transparent dark:from-white/10 pointer-events-none" />

        <div className="relative space-y-5 text-sm">
          {/* Header */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${maintenanceIconAccent}`}>
                {getEventIcon(event.kind, event.priority)}
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{event.title}</h3>
                  {event.status && (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                        event.status === 'open'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/60 dark:text-yellow-200'
                          : event.status === 'resolved'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-200'
                          : event.status === 'completed'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200'
                          : event.status === 'pending'
                          ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                          : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {event.status}
                    </span>
                  )}
                  {maintenanceData.priority && maintenanceData.priority !== 'medium' && (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                        maintenanceData.priority === 'high'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-200'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200'
                      }`}
                    >
                      {toTitleFromSnake(maintenanceData.priority)} Priority
                    </span>
                  )}
                </div>

                <p className="max-w-3xl text-sm text-gray-600 dark:text-gray-300">{event.description}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {maintenanceData.vendor && (
                <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/50 dark:text-purple-200">
                  Vendor: {maintenanceData.vendor}
                </span>
              )}
              {maintenanceData.task_type && (
                <span className="rounded-full bg-gray-900/5 px-3 py-1 text-xs font-medium text-gray-600 backdrop-blur dark:bg-white/10 dark:text-gray-200">
                  {toTitleFromSnake(maintenanceData.task_type)}
                </span>
              )}
              {maintenanceData.category && (
                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700 dark:bg-sky-900/50 dark:text-sky-200">
                  {toTitleFromSnake(maintenanceData.category)}
                </span>
              )}
            </div>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {vehicleData && (
              <div className="rounded-xl border border-blue-200 bg-white/80 p-4 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-200">
                    <Truck className="h-5 w-5" />
                    <span className="text-xs font-semibold uppercase tracking-wide">Vehicle</span>
                  </div>
                  <span className="text-[11px] font-medium text-blue-500 dark:text-blue-300">Assigned</span>
                </div>
                <div className="mt-2 text-base font-semibold text-blue-900 dark:text-blue-100">
                  {vehicleData.registration_number}
                </div>
                {(vehicleData.make || vehicleData.model || vehicleData.year) && (
                  <div className="mt-1 text-xs text-blue-700/80 dark:text-blue-200/80">
                    {[vehicleData.make, vehicleData.model].filter(Boolean).join(' ')}
                    {vehicleData.year ? ` (${vehicleData.year})` : ''}
                  </div>
                )}
                {assignedDriverName && (
                  <div className="mt-3 flex items-center gap-2 text-xs font-medium text-blue-700/80 dark:text-blue-200/80">
                    <User className="h-4 w-4" />
                    <span className="truncate">Driver: {assignedDriverName}</span>
                  </div>
                )}
              </div>
            )}

            {maintenanceData.odometer_reading && (
              <div className="rounded-xl border border-indigo-200 bg-white/80 p-4 shadow-sm dark:border-indigo-900/60 dark:bg-indigo-950/40">
                <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-200">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    <span className="text-xs font-semibold uppercase tracking-wide">Odometer</span>
                  </div>
                  <span className="text-[11px] font-medium">km</span>
                </div>
                <div className="mt-2 text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                  {Number(maintenanceData.odometer_reading).toLocaleString('en-IN')}
                </div>
              </div>
            )}

            {maintenanceData.scheduled_date && (
              <div className="rounded-xl border border-emerald-200 bg-white/80 p-4 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/40">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-200">
                  <Calendar className="h-5 w-5" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Scheduled</span>
                </div>
                <div className="mt-3 text-lg font-semibold text-emerald-900 dark:text-emerald-100">
                  {format(new Date(maintenanceData.scheduled_date), 'MMM dd, yyyy')}
                </div>
              </div>
            )}

            {showCostSummaryCard && (
              <div className="rounded-xl border border-amber-200 bg-white/80 p-4 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/40">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-200">
                  <DollarSign className="h-5 w-5" />
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    {maintenanceData.actual_cost ? 'Actual Cost' : 'Estimated Cost'}
                  </span>
                </div>
                <div className="mt-3 text-lg font-bold text-amber-900 dark:text-amber-100 truncate">
                  {estimatedCostValue !== null && estimatedCostValue !== undefined
                    ? `₹${Number(estimatedCostValue).toLocaleString('en-IN')}`
                    : '₹—'}
                </div>
                {(garageName || maintenanceTypeLabel || serviceModeLabel || workSummary) && (
                  <div className="mt-3 space-y-2 text-xs text-amber-700 dark:text-amber-200/80">
                    {garageName && (
                      <div className="flex items-start gap-2">
                        <Store className="mt-[2px] h-3.5 w-3.5 flex-shrink-0" />
                        <span className="leading-snug">
                          Garage:&nbsp;
                          <span className="font-semibold text-amber-800 dark:text-amber-100">{garageName}</span>
                        </span>
                      </div>
                    )}
                    {maintenanceTypeLabel && (
                      <div className="flex items-start gap-2">
                        <Wrench className="mt-[2px] h-3.5 w-3.5 flex-shrink-0" />
                        <span className="leading-snug">
                          Maintenance Type:&nbsp;
                          <span className="font-semibold text-amber-800 dark:text-amber-100">
                            {maintenanceTypeLabel}
                          </span>
                        </span>
                      </div>
                    )}
                    {serviceModeLabel && (
                      <div className="flex items-start gap-2">
                        <Activity className="mt-[2px] h-3.5 w-3.5 flex-shrink-0" />
                        <span className="leading-snug">
                          Service Mode:&nbsp;
                          <span className="font-semibold text-amber-800 dark:text-amber-100">{serviceModeLabel}</span>
                        </span>
                      </div>
                    )}
                    {workSummary && (
                      <div className="flex items-start gap-2">
                        <ClipboardList className="mt-[2px] h-3.5 w-3.5 flex-shrink-0" />
                        <span className="leading-snug line-clamp-2">
                          Work Done:&nbsp;
                          <span className="font-medium text-amber-800 dark:text-amber-100">{workSummary}</span>
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          {maintenanceData.notes && (
            <div className="rounded-xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/60">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Notes</h4>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">{maintenanceData.notes}</p>
            </div>
          )}

          {/* Attachments */}
          {maintenanceFiles.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Supporting Media
              </h4>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {maintenanceFiles.map((file, index) => (
                  <a
                    key={`${file.url}-${index}`}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg dark:border-gray-700 dark:bg-gray-900/70"
                  >
                    {file.type === 'image' ? (
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                        <img
                          src={file.url}
                          alt={file.label}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                        />
                        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                          <Image className="h-3 w-3" />
                          Photo
                        </div>
                      </div>
                    ) : (
                      <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                        <FileText className="h-8 w-8" />
                        <span className="text-xs font-semibold uppercase tracking-wide">PDF</span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition-colors group-hover:text-blue-600 dark:border-gray-700 dark:text-gray-200">
                      {file.label}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{formatDistanceToNow(new Date(event.event_time), { addSuffix: true })}</span>
            </div>
            {maintenanceData.start_date && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span>Started {format(new Date(maintenanceData.start_date), 'dd MMM yyyy')}</span>
              </div>
            )}
            {maintenanceData.end_date && (
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-gray-400" />
                <span>Completed {format(new Date(maintenanceData.end_date), 'dd MMM yyyy')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Enhanced AI Alert card with structured layout
  if (isAIAlert) {
    // Extract key metrics from title and description
    const alertData = event.entity_json || {};
    const titleMatch = event.title.match(/(\d+(?:\.\d+)?%?)/);
    const keyMetric = titleMatch ? titleMatch[1] : null;

    // Extract trip ID from description
    const tripMatch = event.description.match(/Trip (T\d+-\d+-\d+)/);
    const tripId = tripMatch ? tripMatch[1] : null;

    // Check if this is a route deviation alert
    const isRouteDeviation = event.title.toLowerCase().includes('route deviation');

    // Extract metadata for route deviation
    const metadata = alertData.metadata || {};
    const driverId = metadata.driver_id;
    const tripStartDate = metadata.trip_start_date;
    const actualDistance = metadata.distance;
    const expectedDistance = metadata.expected_value ? (metadata.distance / (metadata.actual_value / 100)) : null;
    const deviationPercent = metadata.deviation;

    // Check if alert is accepted or denied for compact display
    const isResolved = event.status === 'accepted' || event.status === 'denied';

    // Compact version for resolved alerts
    if (isResolved) {
      return (
        <div className={`rounded-lg shadow-sm border-l-4 p-3 hover:shadow-md transition-all cursor-pointer ${
          event.status === 'accepted'
            ? 'border-l-green-500 bg-green-50 dark:bg-green-900/10'
            : 'border-l-gray-400 bg-gray-50 dark:bg-gray-800/50'
        }`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <CheckCircle className={`h-4 w-4 flex-shrink-0 ${
                event.status === 'accepted' ? 'text-green-600' : 'text-gray-400'
              }`} />
              <div className="flex-1 min-w-0">
                <h3 className={`font-medium text-sm truncate ${
                  event.status === 'accepted' ? 'text-green-900 dark:text-green-100' : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {event.title}
                </h3>
              </div>
              {keyMetric && (
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  event.status === 'accepted'
                    ? 'text-green-700 bg-green-100 dark:bg-green-900/40 dark:text-green-300'
                    : 'text-gray-600 bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {keyMetric}
                </span>
              )}
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
              event.status === 'accepted'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}>
              {event.status}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
            <Clock className="h-3 w-3" />
            <span>{formatDistanceToNow(new Date(event.event_time), { addSuffix: true })}</span>
          </div>
        </div>
      );
    }

    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border-l-4 p-5 hover:shadow-md transition-all ${
        event.priority === 'danger' ? 'border-l-red-500 bg-red-50 dark:bg-red-900/20' :
        event.priority === 'warn' ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' :
        'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            {getEventIcon(event.kind, event.priority)}
            <div className="flex-1 min-w-0 space-y-3">
              {/* Header with metric highlight */}
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                  {event.title.split(':')[0]}:
                </h3>
                {keyMetric && (
                  <span className={`px-3 py-1 rounded-lg text-2xl font-bold ${
                    event.priority === 'danger' ? 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40' :
                    event.priority === 'warn' ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/40' :
                    'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40'
                  }`}>
                    {keyMetric}
                  </span>
                )}
                {event.status && (
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ml-auto ${
                    event.status === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' :
                    event.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' :
                    event.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' :
                    'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {event.status}
                  </span>
                )}
              </div>

              {/* Key Information Grid - Vehicle, Driver, Date, Trip */}
              {isRouteDeviation && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 border-y border-gray-200 dark:border-gray-700">
                  {/* Vehicle Number */}
                  {vehicleData?.registration_number && (
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-900/50 rounded-md px-2 py-1.5">
                      <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-medium">Vehicle</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {vehicleData.registration_number}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Driver Number */}
                  {(driverData?.name || driverId) && (
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-900/50 rounded-md px-2 py-1.5">
                      <User className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-medium">Driver</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {driverData?.name || driverId}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Trip Date */}
                  {tripStartDate && (
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-900/50 rounded-md px-2 py-1.5">
                      <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-medium">Date</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {format(new Date(tripStartDate), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Trip ID */}
                  {tripId && (
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-900/50 rounded-md px-2 py-1.5">
                      <Navigation className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-medium">Trip ID</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {tripId}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Distance Information Badge - for route deviation */}
              {isRouteDeviation && actualDistance && (
                <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${
                  event.priority === 'danger' ? 'bg-red-100 dark:bg-red-900/40' :
                  event.priority === 'warn' ? 'bg-yellow-100 dark:bg-yellow-900/40' :
                  'bg-blue-100 dark:bg-blue-900/40'
                }`}>
                  <MapPin className={`h-4 w-4 ${
                    event.priority === 'danger' ? 'text-red-600 dark:text-red-400' :
                    event.priority === 'warn' ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-blue-600 dark:text-blue-400'
                  }`} />
                  <span className={`text-sm font-semibold ${
                    event.priority === 'danger' ? 'text-red-900 dark:text-red-100' :
                    event.priority === 'warn' ? 'text-yellow-900 dark:text-yellow-100' :
                    'text-blue-900 dark:text-blue-100'
                  }`}>
                    {actualDistance.toFixed(1)} km
                    {expectedDistance && (
                      <span className="font-normal"> ({deviationPercent?.toFixed(1)}% longer)</span>
                    )}
                  </span>
                </div>
              )}

              {/* Condensed description */}
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {isRouteDeviation
                  ? "May indicate unauthorized detours, traffic delays, or route planning issues."
                  : event.description.length > 120
                    ? event.description.substring(0, 120) + '...'
                    : event.description
                }
              </p>

              {/* Time stamp */}
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatDistanceToNow(new Date(event.event_time), { addSuffix: true })}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {event.status === 'pending' && (
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => onAction?.(event, 'accept')}
                className="p-2 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/70 transition-colors"
                title="Accept"
              >
                <CheckCircle className="h-5 w-5" />
              </button>
              <button
                onClick={() => onAction?.(event, 'deny')}
                className="p-2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/70 transition-colors"
                title="Deny"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Regular card for other non-trip, non-maintenance events
  if (!isTrip) {
    // For KPI events, extract value from payload if hash marks are present
    const isKPI = event.kind === 'kpi';
    const kpiData = isKPI && event.kpi_data ? event.kpi_data : null;
    let displayDescription = event.description;

    if (isKPI && kpiData) {
      // Extract the kpi_value_human part from description (format: "value - period")
      const parts = event.description.split(' - ');
      const valueHuman = parts[0] || event.description;
      const period = parts[1] || '';

      // Apply hash mark fix
      const fixedValue = extractKPIValue(valueHuman, kpiData.kpi_payload);
      displayDescription = period ? `${fixedValue} - ${period}` : fixedValue;
    }

    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4 hover:shadow-md transition-all ${
        event.priority === 'danger' ? 'border-red-200 bg-red-50 dark:bg-red-900/20' :
        event.priority === 'warn' ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20' :
        'border-gray-200 dark:border-gray-700'
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {getEventIcon(event.kind, event.priority)}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">{event.title}</h3>
                {event.status && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    event.status === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' :
                    event.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' :
                    event.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {event.status}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{displayDescription}</p>

              <div className="flex items-center gap-2 mt-2">
                <Calendar className="h-3 w-3 text-gray-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDistanceToNow(new Date(event.event_time), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Enhanced trip card with visuals
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all overflow-hidden ${
      tripData?.route_deviation > 20 ? 'border-2 border-yellow-400 dark:border-yellow-600' :
      tripData?.fuel_quantity > 100 ? 'border-2 border-orange-400 dark:border-orange-600' :
      'border border-gray-200 dark:border-gray-700'
    }`}>
      {/* Header with Trip Info */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{event.title}</h3>
              <p className="text-blue-100 text-sm">{event.description}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-blue-100">
              {format(new Date(event.event_time), 'MMM dd, yyyy')}
            </div>
            <div className="text-xs text-blue-200">
              {format(new Date(event.event_time), 'HH:mm')}
            </div>
          </div>
        </div>
      </div>

      {/* Map Preview Section */}
      <div className="relative h-32 bg-gray-100 dark:bg-gray-900">
        {/* SVG map simulation */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-green-50 to-blue-50 dark:from-blue-950 dark:via-green-950 dark:to-blue-950">
          <div className="relative h-full w-full">
            {/* Simulated map view with route */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 160">
              {/* Background grid pattern */}
              <pattern id={`grid-${event.id}`} width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
              </pattern>
              <rect width="100%" height="100%" fill={`url(#grid-${event.id})`} />

              {/* Route line */}
              <path
                d="M 50 80 Q 150 40, 250 60 T 350 80"
                stroke="#3B82F6"
                strokeWidth="3"
                fill="none"
                strokeDasharray="5,5"
                className="animate-pulse"
              />

              {/* Start marker */}
              <circle cx="50" cy="80" r="8" fill="#10B981" />
              <text x="50" y="85" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">S</text>

              {/* End marker */}
              <circle cx="350" cy="80" r="8" fill="#EF4444" />
              <text x="350" y="85" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">E</text>

              {/* Distance label */}
              <rect x="170" y="100" width="60" height="20" rx="10" fill="white" fillOpacity="0.9"/>
              <text x="200" y="114" textAnchor="middle" fill="#374151" fontSize="12" fontWeight="500">
                {tripData?.distance || 0} km
              </text>
            </svg>

            {/* Overlay gradient for depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
          </div>
        </div>

        {/* Map overlay info */}
        <div className="absolute bottom-2 left-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg px-2 py-1">
          <div className="flex items-center gap-1 text-xs">
            <Navigation className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-gray-700 dark:text-gray-300">Route Overview</span>
          </div>
        </div>
      </div>

      {/* Driver and Vehicle Info */}
      <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        {/* Driver Info */}
        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-lg p-3">
          <div className="relative">
            {driverData?.photo_url ? (
              <>
                <img
                  src={driverData.photo_url}
                  alt={driverData.name || 'Driver'}
                  className="w-[7.5rem] h-[7.5rem] rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling;
                    if (fallback) fallback.classList.remove('hidden');
                  }}
                />
                <div className="hidden w-[7.5rem] h-[7.5rem] rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                  <span className="text-white font-semibold text-3xl">
                    {driverData?.name?.charAt(0)?.toUpperCase() || 'D'}
                  </span>
                </div>
              </>
            ) : (
              <div className="w-[7.5rem] h-[7.5rem] rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                <span className="text-white font-semibold text-3xl">
                  {driverData?.name?.charAt(0)?.toUpperCase() || 'D'}
                </span>
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
              <Activity className="h-2 w-2 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400">Driver</p>
            <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
              {driverData?.name || 'Not Assigned'}
            </p>
          </div>
        </div>

        {/* Vehicle Info */}
        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-lg p-3">
          <div className="relative">
            {vehicleData?.photo_url ? (
              <>
                <img
                  src={vehicleData.photo_url}
                  alt={vehicleData.registration_number || 'Vehicle'}
                  className="w-[7.5rem] h-[7.5rem] rounded-lg object-cover border-2 border-gray-200 dark:border-gray-700"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling;
                    if (fallback) fallback.classList.remove('hidden');
                  }}
                />
                <div className="hidden w-[7.5rem] h-[7.5rem] rounded-lg bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                  <Truck className="h-12 w-12 text-white" />
                </div>
              </>
            ) : (
              <div className="w-[7.5rem] h-[7.5rem] rounded-lg bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                <Truck className="h-12 w-12 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400">Vehicle</p>
            <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
              {vehicleData?.registration_number || tripData?.vehicle_id}
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4">
        {/* Distance */}
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <MapPin className="h-4 w-4 text-blue-500 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Distance</span>
          </div>
          <p className="text-lg font-bold text-blue-900 dark:text-blue-100 mt-1">
            {tripData?.distance || 0} <span className="text-xs font-normal">km</span>
          </p>
        </div>

        {/* Fuel */}
        {tripData?.fuel_quantity && (
          <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <Fuel className="h-4 w-4 text-orange-500 dark:text-orange-400" />
              <span className="text-xs font-medium text-orange-700 dark:text-orange-300">Fuel</span>
            </div>
            <p className="text-lg font-bold text-orange-900 dark:text-orange-100 mt-1">
              {tripData.fuel_quantity} <span className="text-xs font-normal">L</span>
            </p>
          </div>
        )}

        {/* Revenue */}
        {tripData?.net_profit !== undefined && (
          <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <DollarSign className="h-4 w-4 text-green-500 dark:text-green-400" />
              <span className="text-xs font-medium text-green-700 dark:text-green-300">Revenue</span>
            </div>
            <p className="text-lg font-bold text-green-900 dark:text-green-100 mt-1 truncate">
              {formatCurrency(tripData.net_profit)}
            </p>
          </div>
        )}

        {/* Efficiency/Deviation */}
        {tripData?.route_deviation !== undefined && (
          <div className={`rounded-lg p-3 ${
            tripData.route_deviation > 20 ? 'bg-red-50 dark:bg-red-900/30' :
            tripData.route_deviation > 10 ? 'bg-yellow-50 dark:bg-yellow-900/30' :
            'bg-green-50 dark:bg-green-900/30'
          }`}>
            <div className="flex items-center justify-between">
              <TrendingDown className={`h-4 w-4 ${
                tripData.route_deviation > 20 ? 'text-red-500 dark:text-red-400' :
                tripData.route_deviation > 10 ? 'text-yellow-500 dark:text-yellow-400' :
                'text-green-500 dark:text-green-400'
              }`} />
              <span className={`text-xs font-medium ${
                tripData.route_deviation > 20 ? 'text-red-700 dark:text-red-300' :
                tripData.route_deviation > 10 ? 'text-yellow-700 dark:text-yellow-300' :
                'text-green-700 dark:text-green-300'
              }`}>Deviation</span>
            </div>
            <p className={`text-lg font-bold mt-1 ${
              tripData.route_deviation > 20 ? 'text-red-900 dark:text-red-100' :
              tripData.route_deviation > 10 ? 'text-yellow-900 dark:text-yellow-100' :
              'text-green-900 dark:text-green-100'
            }`}>
              {tripData.route_deviation}%
            </p>
          </div>
        )}
      </div>

      {/* Footer with status and time */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3 text-gray-400" />
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {formatDistanceToNow(new Date(event.event_time), { addSuffix: true })}
          </span>
        </div>
        {event.status && (
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${
            event.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' :
            event.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' :
            'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
          }`}>
            {event.status === 'completed' ? 'Completed' :
             event.status === 'in_progress' ? 'In Progress' :
             event.status}
          </span>
        )}
      </div>
    </div>
  );
}
