/**
 * MobileVehicleCardNew - Completely redesigned vehicle card for mobile
 * 
 * Features:
 * - Beautiful gradient headers based on urgency
 * - Dual refresh buttons (Documents + Challans)
 * - Quick stats pills
 * - Inline document actions
 * - Challan view integration
 * - Modern, polished design
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, RefreshCw, AlertTriangle } from 'lucide-react';
import { Vehicle } from '@/types';
import { MobileQuickStats } from './MobileQuickStats';
import { MobileDocumentActions } from './MobileDocumentActions';
import { MobileChallanView } from './MobileChallanView';
import { fmtDateWithYear } from '@/utils/dateFmt';

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

interface MobileVehicleCardNewProps {
  vehicle: VehicleDocuments;
  vehicleData: Vehicle;
  onRefreshDocs?: (vehicleId: string) => void;
  onRefreshChallan?: (vehicleId: string) => void;
  isRefreshingDocs?: boolean;
  isRefreshingChallan?: boolean;
  onViewChallanDetails?: (vehicleId: string) => void;
}

export const MobileVehicleCardNew: React.FC<MobileVehicleCardNewProps> = ({
  vehicle,
  vehicleData,
  onRefreshDocs,
  onRefreshChallan,
  isRefreshingDocs = false,
  isRefreshingChallan = false,
  onViewChallanDetails
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get gradient background based on urgency
  const getHeaderGradient = () => {
    if (vehicle.__urg.score > 2) {
      return 'bg-gradient-to-r from-error-500 to-error-600';
    } else if (vehicle.__urg.meta.minDTX !== null && vehicle.__urg.meta.minDTX <= 30 && vehicle.__urg.meta.minDTX >= 0) {
      return 'bg-gradient-to-r from-warning-500 to-warning-600';
    }
    return 'bg-gradient-to-r from-success-500 to-success-600';
  };

  // Get document counts for stats
  const getDocumentCounts = () => {
    const docs = vehicle.documents;
    return {
      expired: Object.values(docs).filter(d => d.status === 'expired').length,
      expiring: Object.values(docs).filter(d => d.status === 'expiring').length,
      valid: Object.values(docs).filter(d => d.status === 'valid').length,
      missing: Object.values(docs).filter(d => d.status === 'missing').length
    };
  };

  const counts = getDocumentCounts();

  // Document types with icons and colors
  const documentTypes = [
    { 
      key: 'insurance', 
      label: 'Insurance', 
      urlKey: 'insurance_document_url',
      icon: '🛡️',
      color: 'text-blue-600'
    },
    { 
      key: 'fitness', 
      label: 'Fitness', 
      urlKey: 'fitness_document_url',
      icon: '❤️',
      color: 'text-pink-600'
    },
    { 
      key: 'permit', 
      label: 'Permit', 
      urlKey: 'permit_document_url',
      icon: '📄',
      color: 'text-purple-600'
    },
    { 
      key: 'puc', 
      label: 'PUC', 
      urlKey: 'puc_document_url',
      icon: '💨',
      color: 'text-teal-600'
    },
    { 
      key: 'tax', 
      label: 'Tax', 
      urlKey: 'tax_document_url',
      icon: '🧾',
      color: 'text-orange-600'
    },
    { 
      key: 'rc', 
      label: 'RC Expiry', 
      urlKey: 'rc_document_url',
      icon: '📅',
      color: 'text-indigo-600'
    }
  ];

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'expired':
        return 'bg-error-100 text-error-700 border-error-300';
      case 'expiring':
        return 'bg-warning-100 text-warning-700 border-warning-300';
      case 'valid':
        return 'bg-success-100 text-success-700 border-success-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div className="mobile-vehicle-card-new bg-white rounded-xl shadow-lg mb-4 overflow-hidden border border-gray-200">
      {/* Header with Gradient */}
      <div className={`${getHeaderGradient()} px-4 py-3 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-base font-bold tracking-wide">
              {vehicle.registration}
            </h3>
            <div className="text-xs opacity-90 mt-0.5">
              {counts.expired > 0 && `${counts.expired} Expired`}
              {counts.expired > 0 && counts.expiring > 0 && ' • '}
              {counts.expiring > 0 && `${counts.expiring} Expiring`}
              {counts.expired === 0 && counts.expiring === 0 && 'All Valid'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Document Refresh Button */}
            {onRefreshDocs && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRefreshDocs(vehicle.id);
                }}
                disabled={isRefreshingDocs}
                className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all touch-manipulation active:scale-95 disabled:opacity-50 border border-white/30"
                style={{ minWidth: '52px', minHeight: '52px' }}
                title="Refresh documents"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshingDocs ? 'animate-spin' : ''}`} />
                <span className="text-[10px] font-medium">Docs</span>
              </button>
            )}

            {/* Challan Refresh Button */}
            {onRefreshChallan && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRefreshChallan(vehicle.id);
                }}
                disabled={isRefreshingChallan}
                className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all touch-manipulation active:scale-95 disabled:opacity-50 border border-white/30"
                style={{ minWidth: '52px', minHeight: '52px' }}
                title="Check challans"
              >
                <AlertTriangle className={`h-4 w-4 ${isRefreshingChallan ? 'animate-spin' : ''}`} />
                <span className="text-[10px] font-medium">Challan</span>
              </button>
            )}

            {/* Expand/Collapse */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
            >
              {isExpanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <MobileQuickStats
        expired={counts.expired}
        expiring={counts.expiring}
        valid={counts.valid}
        missing={counts.missing}
      />

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="px-4 py-3 space-y-3 bg-gray-50">
              {/* Documents List */}
              {documentTypes.map(({ key, label, urlKey, icon, color }) => {
                const docInfo = vehicle.documents[key as keyof typeof vehicle.documents];
                const docPaths = vehicleData?.[urlKey as keyof Vehicle] as string[] | undefined;
                const formattedDate = fmtDateWithYear(docInfo.date, 'short');

                return (
                  <div
                    key={key}
                    className="bg-white rounded-lg p-3 shadow-sm border border-gray-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-xl">{icon}</span>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900">
                            {label}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-600">
                              {formattedDate}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getStatusColor(docInfo.status)}`}>
                              {docInfo.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Inline Actions */}
                    <MobileDocumentActions
                      vehicleNumber={vehicle.registration}
                      docKind={label}
                      docPaths={docPaths || null}
                      expiryDate={formattedDate}
                    />
                  </div>
                );
              })}

              {/* Challan View */}
              <MobileChallanView
                totalChallans={vehicleData?.total_challans || 0}
                pendingAmount={vehicleData?.pending_challan_amount || 0}
                lastChecked={vehicleData?.challan_last_checked}
                challans={[]}
                onRefresh={() => onRefreshChallan?.(vehicle.id)}
                isRefreshing={isRefreshingChallan}
                onViewAll={() => onViewChallanDetails?.(vehicle.id)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

