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
import { ChevronDown, ChevronUp, RefreshCw, AlertTriangle, Paperclip, AlertCircle, Clock, CheckCircle, FileX } from 'lucide-react';
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

  // Get gradient background based on 4 CRITICAL docs only (Insurance, Tax, Permit, Fitness)
  const getHeaderGradient = () => {
    const criticalDocs = {
      insurance: vehicle.documents.insurance,
      tax: vehicle.documents.tax,
      permit: vehicle.documents.permit,
      fitness: vehicle.documents.fitness
    };

    // Check if ANY critical doc is expired
    const hasExpired = Object.values(criticalDocs).some(doc => doc.status === 'expired');
    if (hasExpired) {
      return 'bg-gradient-to-r from-error-500 to-error-600';
    }

    // Check if ANY critical doc is expiring soon (within 30 days)
    const hasExpiring = Object.values(criticalDocs).some(doc => doc.status === 'expiring');
    if (hasExpiring) {
      return 'bg-gradient-to-r from-warning-500 to-warning-600';
    }

    // Check if ANY critical doc has missing data (no date entered)
    const hasMissing = Object.values(criticalDocs).some(doc => doc.status === 'missing');
    if (hasMissing) {
      return 'bg-gradient-to-r from-gray-400 to-gray-500';
    }

    // All 4 critical docs are valid
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

  // Get which critical documents have issues
  const getCriticalDocStatus = () => {
    const critical = ['insurance', 'tax', 'permit', 'fitness'];
    const expired: string[] = [];
    const expiring: string[] = [];
    const missing: string[] = [];

    critical.forEach(key => {
      const doc = vehicle.documents[key as keyof typeof vehicle.documents];
      if (doc.status === 'expired') expired.push(key);
      else if (doc.status === 'expiring') expiring.push(key);
      else if (doc.status === 'missing') missing.push(key);
    });

    return { expired, expiring, missing };
  };

  const criticalStatus = getCriticalDocStatus();

  // Check if documents are uploaded
  const getUploadStatus = () => {
    return {
      insurance: !!vehicleData?.insurance_document_url,
      fitness: !!vehicleData?.fitness_document_url,
      tax: !!vehicleData?.tax_document_url,
      permit: !!vehicleData?.permit_document_url,
      rc: !!vehicleData?.rc_document_url,
      puc: !!vehicleData?.puc_document_url
    };
  };

  const uploadStatus = getUploadStatus();

  // Check non-critical doc issues (RC, PUC)
  const getNonCriticalIssues = () => {
    const issues: string[] = [];
    if (vehicle.documents.rc.status === 'expired') issues.push('RC expired');
    if (vehicle.documents.puc.status === 'expired') issues.push('PUC expired');
    return issues;
  };

  const nonCriticalIssues = getNonCriticalIssues();

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
      icon: '🏥',
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
              {criticalStatus.expired.length > 0 && (
                <span>{criticalStatus.expired.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')} Expired</span>
              )}
              {criticalStatus.expired.length > 0 && criticalStatus.expiring.length > 0 && ' • '}
              {criticalStatus.expiring.length > 0 && (
                <span>{criticalStatus.expiring.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')} Expiring</span>
              )}
              {criticalStatus.expired.length === 0 && criticalStatus.expiring.length === 0 && criticalStatus.missing.length === 0 && 'All Valid'}
              {criticalStatus.missing.length > 0 && criticalStatus.expired.length === 0 && criticalStatus.expiring.length === 0 && 'Data Missing'}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Document Refresh Button */}
            {onRefreshDocs && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRefreshDocs(vehicle.id);
                }}
                disabled={isRefreshingDocs}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all touch-manipulation active:scale-95 disabled:opacity-50 border border-white/30"
                style={{ minWidth: '56px', minHeight: '54px' }}
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
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all touch-manipulation active:scale-95 disabled:opacity-50 border border-white/30"
                style={{ minWidth: '56px', minHeight: '54px' }}
                title="Check challans"
              >
                <AlertTriangle className={`h-4 w-4 ${isRefreshingChallan ? 'animate-spin' : ''}`} />
                <span className="text-[10px] font-medium">Challan</span>
              </button>
            )}

            {/* Expand/Collapse */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2.5 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
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

      {/* Quick Stats Bar with Upload Indicators */}
      <div className="px-4 py-3 border-b border-gray-200 space-y-2">
        {/* Status Pills */}
        <div className="flex flex-wrap gap-1.5">
          {counts.expired > 0 && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-error-100 text-error-700 border border-error-300 font-medium">
              <AlertCircle className="h-3 w-3" />
              {counts.expired} Expired
            </span>
          )}
          {counts.expiring > 0 && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-warning-100 text-warning-700 border border-warning-300 font-medium">
              <Clock className="h-3 w-3" />
              {counts.expiring} Expiring
            </span>
          )}
          {counts.valid > 0 && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-success-100 text-success-700 border border-success-300 font-medium">
              <CheckCircle className="h-3 w-3" />
              {counts.valid} Valid
            </span>
          )}
          {counts.missing > 0 && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-300 font-medium">
              <FileX className="h-3 w-3" />
              {counts.missing} Missing
            </span>
          )}
        </div>

        {/* Document Upload Status Buttons */}
        <div className="flex flex-wrap gap-1.5">
          {(['insurance', 'tax', 'permit', 'fitness', 'rc', 'puc'] as const).map(docKey => {
            const doc = vehicle.documents[docKey];
            const isUploaded = uploadStatus[docKey];
            
            let buttonColor = 'bg-gray-100 border-gray-300 text-gray-700';
            if (doc.status === 'expired') buttonColor = 'bg-error-100 border-error-300 text-error-700';
            else if (doc.status === 'expiring') buttonColor = 'bg-warning-100 border-warning-300 text-warning-700';
            else if (doc.status === 'valid') buttonColor = 'bg-success-100 border-success-300 text-success-700';

            const docLabel = docKey === 'insurance' ? 'Ins' : 
                            docKey === 'fitness' ? 'Fit' : 
                            docKey === 'permit' ? 'Per' : 
                            docKey.toUpperCase();

            return (
              <button
                key={docKey}
                className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border font-medium ${buttonColor} touch-manipulation active:scale-95`}
                title={`${docKey.charAt(0).toUpperCase() + docKey.slice(1)}: ${doc.status}${isUploaded ? ' (File uploaded)' : ' (No file)'}`}
              >
                <span>{docLabel}</span>
                {isUploaded && <Paperclip className="h-2.5 w-2.5" />}
              </button>
            );
          })}
        </div>

        {/* Warning for Missing Upload on Critical Docs */}
        {criticalStatus.expired.length === 0 && criticalStatus.expiring.length === 0 && 
         (criticalStatus.missing.length > 0 || !uploadStatus.insurance || !uploadStatus.tax || !uploadStatus.permit || !uploadStatus.fitness) && (
          <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-xs text-red-700">
              {criticalStatus.missing.length > 0 && (
                <div className="font-medium">Missing data: {criticalStatus.missing.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}</div>
              )}
              {(!uploadStatus.insurance || !uploadStatus.tax || !uploadStatus.permit || !uploadStatus.fitness) && (
                <div className={criticalStatus.missing.length > 0 ? 'mt-0.5' : ''}>
                  Files not uploaded: {
                    ['insurance', 'tax', 'permit', 'fitness']
                      .filter(k => !uploadStatus[k as keyof typeof uploadStatus])
                      .map(d => d.charAt(0).toUpperCase() + d.slice(1))
                      .join(', ')
                  }
                </div>
              )}
            </div>
          </div>
        )}

        {/* Warning for Non-Critical Docs (RC, PUC) */}
        {nonCriticalIssues.length > 0 && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
            <span className="text-[11px] text-amber-700 font-medium">
              {nonCriticalIssues.join(', ')}
            </span>
          </div>
        )}
      </div>

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

