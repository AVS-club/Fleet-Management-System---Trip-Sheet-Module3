import React, { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Clock, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { ANIMATIONS } from '@/utils/animations';
import { MaintenanceTask } from '@/types/maintenance';
import AnimatedButton from '../ui/AnimatedButton';
import AnimatedError from '../ui/AnimatedError';

interface EnhancedDowntimeSectionProps {
  className?: string;
}

const DOWNTIME_PRESETS = [
  { id: "2h", label: "2 h", days: 0, hours: 2, color: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: "4h", label: "4 h", days: 0, hours: 4, color: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: "6h", label: "6 h", days: 0, hours: 6, color: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: "8h", label: "8 h", days: 0, hours: 8, color: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: "1d", label: "1 d", days: 1, hours: 0, color: "bg-orange-100 text-orange-700 border-orange-200" },
  { id: "2d", label: "2 d", days: 2, hours: 0, color: "bg-orange-100 text-orange-700 border-orange-200" },
  { id: "3d", label: "3 d", days: 3, hours: 0, color: "bg-red-100 text-red-700 border-red-200" },
];

const DOWNTIME_CATEGORIES = [
  { value: 'maintenance', label: 'Maintenance', icon: '🔧', color: 'bg-blue-50 text-blue-700' },
  { value: 'repair', label: 'Repair', icon: '🛠️', color: 'bg-orange-50 text-orange-700' },
  { value: 'inspection', label: 'Inspection', icon: '🔍', color: 'bg-green-50 text-green-700' },
  { value: 'accident', label: 'Accident', icon: '⚠️', color: 'bg-red-50 text-red-700' },
  { value: 'breakdown', label: 'Breakdown', icon: '🚨', color: 'bg-red-50 text-red-700' },
  { value: 'scheduled', label: 'Scheduled', icon: '📅', color: 'bg-purple-50 text-purple-700' },
  { value: 'emergency', label: 'Emergency', icon: '🚑', color: 'bg-red-50 text-red-700' },
];

const IMPACT_LEVELS = [
  { value: 'low', label: 'Low Impact', color: 'bg-green-100 text-green-700', description: 'Minimal business impact' },
  { value: 'medium', label: 'Medium Impact', color: 'bg-yellow-100 text-yellow-700', description: 'Moderate business impact' },
  { value: 'high', label: 'High Impact', color: 'bg-orange-100 text-orange-700', description: 'Significant business impact' },
  { value: 'critical', label: 'Critical Impact', color: 'bg-red-100 text-red-700', description: 'Severe business impact' },
];

const EnhancedDowntimeSection: React.FC<EnhancedDowntimeSectionProps> = ({ className = '' }) => {
  const { register, watch, setValue, formState: { errors } } = useFormContext<Partial<MaintenanceTask>>();
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [downtimeStartTime, setDowntimeStartTime] = useState<string>('');
  const [downtimeEndTime, setDowntimeEndTime] = useState<string>('');

  const downtimeDays = watch('downtime_days') || 0;
  const downtimeHours = watch('downtime_hours') || 0;
  const downtimeCategory = watch('downtime_category') || 'maintenance';
  const downtimeImpactLevel = watch('downtime_impact_level') || 'medium';
  const downtimeReason = watch('downtime_reason') || '';

  // Calculate total downtime for display
  const totalDowntimeHours = (downtimeDays * 24) + downtimeHours;
  const totalDowntimeDays = Math.floor(totalDowntimeHours / 24);
  const remainingHours = totalDowntimeHours % 24;

  // Handle preset selection
  const handlePresetSelect = (preset: typeof DOWNTIME_PRESETS[0]) => {
    setValue('downtime_days', preset.days);
    setValue('downtime_hours', preset.hours);
    setSelectedPreset(preset.id);
    
    // Add success animation
    setTimeout(() => {
      setSelectedPreset(null);
    }, 1000);
  };

  // Handle custom downtime input
  const handleCustomDowntimeChange = (field: 'downtime_days' | 'downtime_hours', value: number) => {
    setValue(field, Math.max(0, value));
    setSelectedPreset(null);
  };

  // Auto-calculate downtime from start/end times
  useEffect(() => {
    if (downtimeStartTime && downtimeEndTime) {
      const start = new Date(downtimeStartTime);
      const end = new Date(downtimeEndTime);
      
      if (end > start) {
        const diffMs = end.getTime() - start.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const days = Math.floor(diffHours / 24);
        const hours = diffHours % 24;
        
        setValue('downtime_days', days);
        setValue('downtime_hours', hours);
      }
    }
  }, [downtimeStartTime, downtimeEndTime, setValue]);

  return (
    <div className={`bg-white rounded-lg shadow-sm p-5 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Clock className="h-5 w-5 mr-2 text-primary-500" />
          Downtime Tracking
        </h3>
        
        <AnimatedButton
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-primary-600 hover:text-primary-700"
        >
          {showAdvanced ? 'Simple' : 'Advanced'}
        </AnimatedButton>
      </div>

      {/* Downtime Summary */}
      {totalDowntimeHours > 0 && (
        <div 
          className={`
            p-4 rounded-lg border-2 border-dashed
            ${ANIMATIONS.CLASSES.TRANSITION_SMOOTH}
            animate-in fade-in slide-in-from-top-1 duration-300
          `}
          style={{
            borderColor: downtimeImpactLevel === 'critical' ? '#ef4444' : 
                        downtimeImpactLevel === 'high' ? '#f97316' :
                        downtimeImpactLevel === 'medium' ? '#eab308' : '#22c55e'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Clock className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">
                  Total Downtime: {totalDowntimeDays > 0 && `${totalDowntimeDays}d `}{remainingHours}h
                </h4>
                <p className="text-sm text-gray-600">
                  {DOWNTIME_CATEGORIES.find(c => c.value === downtimeCategory)?.icon} 
                  {DOWNTIME_CATEGORIES.find(c => c.value === downtimeCategory)?.label}
                  {' • '}
                  {IMPACT_LEVELS.find(i => i.value === downtimeImpactLevel)?.label}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold text-primary-600">
                {totalDowntimeHours}h
              </div>
              <div className="text-xs text-gray-500">Total Hours</div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Presets */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Quick Select
        </label>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {DOWNTIME_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetSelect(preset)}
              className={`
                px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all duration-200
                ${selectedPreset === preset.id 
                  ? 'animate-pulse scale-110 shadow-lg' 
                  : preset.color
                }
                ${ANIMATIONS.CLASSES.HOVER_SCALE}
                focus:outline-none focus:ring-2 focus:ring-primary-500
              `}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Input */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Days
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="1"
              value={downtimeDays}
              onChange={(e) => handleCustomDowntimeChange('downtime_days', parseInt(e.target.value) || 0)}
              className={`
                w-full px-3 py-2 border rounded-lg
                focus:outline-none focus:ring-2 focus:ring-primary-500
                ${errors.downtime_days ? 'border-red-500 animate-shake' : 'border-gray-300'}
                ${ANIMATIONS.CLASSES.TRANSITION_SMOOTH}
              `}
              placeholder="0"
            />
            {errors.downtime_days && (
              <AnimatedError message={errors.downtime_days.message} />
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hours
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              max="23"
              step="1"
              value={downtimeHours}
              onChange={(e) => handleCustomDowntimeChange('downtime_hours', parseInt(e.target.value) || 0)}
              className={`
                w-full px-3 py-2 border rounded-lg
                focus:outline-none focus:ring-2 focus:ring-primary-500
                ${errors.downtime_hours ? 'border-red-500 animate-shake' : 'border-gray-300'}
                ${ANIMATIONS.CLASSES.TRANSITION_SMOOTH}
              `}
              placeholder="0"
            />
            {errors.downtime_hours && (
              <AnimatedError message={errors.downtime_hours.message} />
            )}
          </div>
        </div>
      </div>

      {/* Advanced Options */}
      {showAdvanced && (
        <div 
          className={`
            space-y-4 p-4 bg-gray-50 rounded-lg border
            animate-in fade-in slide-in-from-top-1 duration-300
          `}
        >
          <h4 className="font-medium text-gray-900 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
            Advanced Downtime Tracking
          </h4>

          {/* Start/End Times */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="datetime-local"
                value={downtimeStartTime}
                onChange={(e) => setDowntimeStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                type="datetime-local"
                value={downtimeEndTime}
                onChange={(e) => setDowntimeEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Downtime Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DOWNTIME_CATEGORIES.map((category) => (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => setValue('downtime_category', category.value)}
                  className={`
                    p-3 rounded-lg border-2 text-center transition-all duration-200
                    ${downtimeCategory === category.value 
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:border-gray-300'
                    }
                    ${ANIMATIONS.CLASSES.HOVER_SCALE}
                  `}
                >
                  <div className="text-2xl mb-1">{category.icon}</div>
                  <div className="text-xs font-medium">{category.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Impact Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Impact Level
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {IMPACT_LEVELS.map((impact) => (
                <button
                  key={impact.value}
                  type="button"
                  onClick={() => setValue('downtime_impact_level', impact.value)}
                  className={`
                    p-3 rounded-lg border-2 text-center transition-all duration-200
                    ${downtimeImpactLevel === impact.value 
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:border-gray-300'
                    }
                    ${ANIMATIONS.CLASSES.HOVER_SCALE}
                  `}
                >
                  <div className={`text-sm font-medium ${impact.color}`}>
                    {impact.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {impact.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason (Optional)
            </label>
            <textarea
              {...register('downtime_reason')}
              value={downtimeReason}
              onChange={(e) => setValue('downtime_reason', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Describe the reason for downtime..."
              rows={3}
            />
          </div>
        </div>
      )}

      {/* Validation Messages */}
      {errors.downtime_days && (
        <AnimatedError message={errors.downtime_days.message} />
      )}
      {errors.downtime_hours && (
        <AnimatedError message={errors.downtime_hours.message} />
      )}
    </div>
  );
};

export default EnhancedDowntimeSection;
