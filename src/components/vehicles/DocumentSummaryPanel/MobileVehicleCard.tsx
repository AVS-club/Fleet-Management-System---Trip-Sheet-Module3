/**
 * MobileVehicleCard - Individual vehicle document card for mobile view
 * 
 * Features:
 * - Collapsible accordion-style layout
 * - Touch-friendly document cells with action sheet
 * - Color-coded urgency indicators
 * - Smooth animations
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Shield,
  Heart,
  FileText,
  Wind,
  Receipt,
  Calendar
} from 'lucide-react';
import { Vehicle } from '@/types';
import { MobileDocumentCell } from '../../documents/MobileDocumentCell';
import { format, parseISO } from 'date-fns';

interface DocumentInfo {
  date: string | null;
  status: 'expired' | 'expiring' | 'valid' | 'missing';
}

interface VehicleDocuments {
  id: string;
  registration: string;
  registrationDate: string | null;
  documents: {
    rc: DocumentInfo;
    insurance: DocumentInfo;
    fitness: DocumentInfo;
    permit: DocumentInfo;
    puc: DocumentInfo;
    tax: DocumentInfo;
  };
  __urg: {
    score: number;
    meta: {
      expired: number;
      minDTX: number | null;
      missing: number;
    };
  };
}

interface MobileVehicleCardProps {
  vehicle: VehicleDocuments;
  vehicleData: Vehicle;
  onRefresh?: (vehicleId: string) => void;
  isRefreshing?: boolean;
}

export const MobileVehicleCard: React.FC<MobileVehicleCardProps> = ({
  vehicle,
  vehicleData,
  onRefresh,
  isRefreshing = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine card border color (left indicator)
  const getUrgencyBorderColor = () => {
    if (vehicle.__urg.score > 2) {
      return 'border-l-error-500';
    } else if (vehicle.__urg.meta.minDTX !== null && vehicle.__urg.meta.minDTX <= 30 && vehicle.__urg.meta.minDTX >= 0) {
      return 'border-l-warning-500';
    }
    return 'border-l-success-500';
  };

  // Determine header background color
  const getUrgencyHeaderColor = () => {
    if (vehicle.__urg.score > 2) {
      return 'bg-error-50';
    } else if (vehicle.__urg.meta.minDTX !== null && vehicle.__urg.meta.minDTX <= 30 && vehicle.__urg.meta.minDTX >= 0) {
      return 'bg-warning-50';
    }
    return 'bg-white';
  };

  // Get background color for individual document row
  const getDocumentRowColor = (status: 'expired' | 'expiring' | 'valid' | 'missing') => {
    switch (status) {
      case 'expired':
        return 'bg-error-50/50';
      case 'expiring':
        return 'bg-warning-50/50';
      case 'valid':
        return 'bg-success-50/30';
      case 'missing':
        return 'bg-gray-50';
      default:
        return 'bg-white';
    }
  };

  // Get summary status for collapsed view
  const getDocumentSummary = () => {
    const docs = vehicle.documents;
    const expired = vehicle.__urg.meta.expired;
    const expiring = Object.values(docs).filter(d => d.status === 'expiring').length;
    const valid = Object.values(docs).filter(d => d.status === 'valid').length;

    if (expired > 0) {
      return { icon: <AlertCircle className="h-4 w-4" />, text: `${expired} Expired`, color: 'text-error-700' };
    } else if (expiring > 0) {
      return { icon: <Clock className="h-4 w-4" />, text: `${expiring} Expiring Soon`, color: 'text-warning-700' };
    }
    return { icon: <CheckCircle className="h-4 w-4" />, text: 'All Valid', color: 'text-success-700' };
  };

  const summary = getDocumentSummary();

  // Document type labels with icons and colors
  const documentTypes = [
    { 
      key: 'insurance', 
      label: 'Insurance', 
      urlKey: 'insurance_document_url',
      icon: Shield,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100'
    },
    { 
      key: 'fitness', 
      label: 'Fitness', 
      urlKey: 'fitness_document_url',
      icon: Heart,
      iconColor: 'text-pink-600',
      iconBg: 'bg-pink-100'
    },
    { 
      key: 'permit', 
      label: 'Permit', 
      urlKey: 'permit_document_url',
      icon: FileText,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100'
    },
    { 
      key: 'puc', 
      label: 'PUC', 
      urlKey: 'puc_document_url',
      icon: Wind,
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-100'
    },
    { 
      key: 'tax', 
      label: 'Tax', 
      urlKey: 'tax_document_url',
      icon: Receipt,
      iconColor: 'text-orange-600',
      iconBg: 'bg-orange-100'
    },
    { 
      key: 'rc', 
      label: 'RC Expiry', 
      urlKey: 'rc_document_url',
      icon: Calendar,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-100'
    }
  ];

  return (
    <div className={`mobile-vehicle-card border-l-4 rounded-lg shadow-sm mb-3 overflow-hidden bg-white ${getUrgencyBorderColor()}`}>
      {/* Card Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full px-4 py-3 flex items-center justify-between touch-manipulation active:opacity-90 transition-all ${getUrgencyHeaderColor()}`}
      >
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900">
              {vehicle.registration}
            </h3>
            {vehicleData?.vahan_last_fetched_at && (
              <span className="text-xs text-blue-600">
                Updated {format(parseISO(vehicleData.vahan_last_fetched_at), 'MMM d')}
              </span>
            )}
          </div>
          <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${summary.color}`}>
            {summary.icon}
            <span>{summary.text}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRefresh(vehicle.id);
              }}
              disabled={isRefreshing}
              className="p-2.5 hover:bg-primary-100 bg-primary-50 rounded-lg touch-manipulation active:scale-95 transition-all border border-primary-200"
              title="Refresh this vehicle's data"
              style={{ minWidth: '40px', minHeight: '40px' }}
            >
              <RefreshCw className={`h-5 w-5 text-primary-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Card Body - Expandable */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-200"
          >
            <div className="px-4 py-3 space-y-2">
              {documentTypes.map(({ key, label, urlKey, icon: Icon, iconColor, iconBg }) => {
                const docInfo = vehicle.documents[key as keyof typeof vehicle.documents];
                const docPaths = vehicleData?.[urlKey as keyof Vehicle] as string[] | undefined;

                return (
                  <div 
                    key={key} 
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${getDocumentRowColor(docInfo.status)}`}
                  >
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <div className={`p-1.5 rounded-md ${iconBg}`}>
                        <Icon className={`h-4 w-4 ${iconColor}`} />
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {label}
                      </span>
                    </div>
                    <div className="flex-1 flex justify-end">
                      <MobileDocumentCell
                        vehicleId={vehicle.id}
                        vehicleNumber={vehicle.registration}
                        docKind={key as any}
                        expiryDate={docInfo.date}
                        docPaths={docPaths || null}
                        preferredFormat="short"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

