/**
 * MobileDocumentSummary - Main mobile layout for document summary
 * 
 * Features:
 * - Mobile-first design
 * - Collapsible vehicle cards
 * - Bottom sheet filters
 * - Horizontally scrollable stats
 * - Touch-optimized interactions
 */

import React, { useState } from 'react';
import { ArrowLeft, Search, Filter, MoreVertical, FileSpreadsheet, Printer, Download, RefreshCw, AlertTriangle } from 'lucide-react';
import { MobileVehicleCard } from './MobileVehicleCard';
import { MobileVehicleCardNew } from './MobileVehicleCardNew';
import { MobileStatsCards } from './MobileStatsCards';
import { MobileFilterDrawer } from './MobileFilterDrawer';
import { MobileChartsView } from './MobileChartsView';
import { ChallanInfoModal } from '../../ChallanInfoModal';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import { Vehicle } from '@/types';
import { motion } from 'framer-motion';

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

interface MonthlyExpenditure {
  month: string;
  rc: number;
  insurance: number;
  fitness: number;
  permit: number;
  puc: number;
  tax: number;
  other: number;
}

interface VehicleExpenditure {
  vehicle: string;
  amount: number;
}

interface Metrics {
  totalVehicles: number;
  expiredDocs: number;
  expiringSoon: number;
  validDocs: number;
  missingDocs: number;
}

interface MobileDocumentSummaryProps {
  onClose: () => void;
  sortedDocumentMatrix: VehicleDocuments[];
  vehicles: Vehicle[];
  metrics: Metrics;
  monthlyExpenditure: MonthlyExpenditure[];
  vehicleExpenditure: VehicleExpenditure[];
  
  // Search and filter
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  
  // Filter state
  dateRange: string;
  customStartDate: string;
  customEndDate: string;
  vehicleFilter: string;
  documentTypeFilter: string;
  
  // Filter setters
  setDateRange: (value: string) => void;
  setCustomStartDate: (value: string) => void;
  setCustomEndDate: (value: string) => void;
  setVehicleFilter: (value: string) => void;
  setDocumentTypeFilter: (value: string) => void;
  
  // Actions
  onRefreshVehicle?: (vehicleId: string) => void;
  onRefreshChallan?: (vehicleId: string) => void;
  onRefreshAll?: () => void;
  onCheckChallans?: () => void;
  onExportExcel?: () => void;
  onExportPDF?: () => void;
  onPrint?: () => void;
  onViewChallanDetails?: (vehicleId: string) => void;
  
  // Loading states
  isBulkRefreshing?: boolean;
  isBulkChallanLoading?: boolean;
  challanRefreshProgress?: number;
  refreshProgress?: {[key: string]: string};
  
  // Challan modal
  showChallanModal?: boolean;
  setShowChallanModal?: (show: boolean) => void;
  currentChallanData?: any;
}

export const MobileDocumentSummary: React.FC<MobileDocumentSummaryProps> = ({
  onClose,
  sortedDocumentMatrix,
  vehicles,
  metrics,
  monthlyExpenditure,
  vehicleExpenditure,
  searchTerm,
  setSearchTerm,
  dateRange,
  customStartDate,
  customEndDate,
  vehicleFilter,
  documentTypeFilter,
  setDateRange,
  setCustomStartDate,
  setCustomEndDate,
  setVehicleFilter,
  setDocumentTypeFilter,
  onRefreshVehicle,
  onRefreshChallan,
  onRefreshAll,
  onCheckChallans,
  onExportExcel,
  onExportPDF,
  onPrint,
  onViewChallanDetails,
  isBulkRefreshing = false,
  isBulkChallanLoading = false,
  challanRefreshProgress = 0,
  refreshProgress = {},
  showChallanModal = false,
  setShowChallanModal,
  currentChallanData
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [chartsExpanded, setChartsExpanded] = useState(false);
  const [refreshingVehicles, setRefreshingVehicles] = useState<{[key: string]: boolean}>({});
  const [refreshingChallans, setRefreshingChallans] = useState<{[key: string]: boolean}>({});

  const handleResetFilters = () => {
    setDateRange('allTime' as any);
    setCustomStartDate('');
    setCustomEndDate('');
    setVehicleFilter('all');
    setDocumentTypeFilter('all');
    setSearchTerm('');
  };

  return (
    <div className="mobile-document-summary flex flex-col h-full bg-gray-50">
      {/* Fixed Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-3 py-3">
          <button
            onClick={onClose}
            className="flex items-center gap-2 p-2 -ml-2 hover:bg-gray-100 rounded-lg touch-manipulation active:scale-95 transition-transform"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <ArrowLeft className="h-6 w-6 text-gray-700" />
            <span className="text-sm font-medium text-gray-700">Back</span>
          </button>
          <h2 className="text-base font-semibold text-gray-900 flex-1 text-center">
            Documents
          </h2>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 -mr-2 hover:bg-gray-100 rounded-full touch-manipulation active:scale-95 transition-transform"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <MoreVertical className="h-5 w-5 text-gray-700" />
            </button>
            
            {/* Action Menu */}
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                >
                  {onExportExcel && (
                    <button
                      onClick={() => {
                        onExportExcel();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      Export to Excel
                    </button>
                  )}
                  {onExportPDF && (
                    <button
                      onClick={() => {
                        onExportPDF();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Export to PDF
                    </button>
                  )}
                  {onPrint && (
                    <button
                      onClick={() => {
                        onPrint();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Printer className="h-4 w-4" />
                      Print
                    </button>
                  )}
                </motion.div>
              </>
            )}
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="px-3 pb-3 flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search vehicles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
              style={{ minHeight: '44px' }}
            />
          </div>
          <button
            onClick={() => setShowFilters(true)}
            className={`px-3 py-2 rounded-lg border-2 touch-manipulation flex items-center gap-2 transition-colors active:scale-95 ${
              vehicleFilter !== 'all' || documentTypeFilter !== 'all' || dateRange !== 'allTime'
                ? 'bg-primary-50 border-primary-300 text-primary-700'
                : 'bg-white border-gray-300 text-gray-700'
            }`}
            style={{ minHeight: '44px' }}
          >
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filter</span>
          </button>
        </div>

        {/* Action Buttons Row */}
        <div className="px-3 pb-3 flex gap-2">
          {onCheckChallans && (
            <button
              onClick={onCheckChallans}
              disabled={isBulkChallanLoading || vehicles.length === 0}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 font-medium text-sm transition-all touch-manipulation active:scale-95 ${
                isBulkChallanLoading 
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-700 cursor-not-allowed' 
                  : 'bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100'
              }`}
              style={{ minHeight: '44px' }}
            >
              <AlertTriangle className={`h-4 w-4 ${isBulkChallanLoading ? 'animate-spin' : ''}`} />
              <span>
                {isBulkChallanLoading 
                  ? `${Math.round(challanRefreshProgress)}%` 
                  : `Challans${vehicles.length > 0 ? ` (${vehicles.length})` : ''}`
                }
              </span>
            </button>
          )}
          
          {onRefreshAll && (
            <button
              onClick={onRefreshAll}
              disabled={isBulkRefreshing || vehicles.length === 0}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 font-medium text-sm transition-all touch-manipulation active:scale-95 ${
                isBulkRefreshing 
                  ? 'bg-blue-50 border-blue-200 text-blue-700 cursor-not-allowed' 
                  : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
              }`}
              style={{ minHeight: '44px' }}
            >
              <RefreshCw className={`h-4 w-4 ${isBulkRefreshing ? 'animate-spin' : ''}`} />
              <span>
                {isBulkRefreshing 
                  ? `${Object.values(refreshProgress).filter(s => s === 'success' || s === 'error').length}/${vehicles.length}` 
                  : 'Refresh All'
                }
              </span>
            </button>
          )}
        </div>

        {/* Progress Indicators */}
        {isBulkRefreshing && (
          <div className="mx-3 mb-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-blue-800">Refreshing Vehicle Data</span>
              <span className="text-xs text-blue-600">
                {Object.values(refreshProgress).filter(s => s === 'success' || s === 'error').length} / {vehicles.length}
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.round((Object.values(refreshProgress).filter(s => s === 'success' || s === 'error').length / vehicles.length) * 100)}%`
                }}
              />
            </div>
          </div>
        )}

        {isBulkChallanLoading && (
          <div className="mx-3 mb-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-yellow-800">Checking Challans</span>
              <span className="text-xs text-yellow-600">{Math.round(challanRefreshProgress)}%</span>
            </div>
            <div className="w-full bg-yellow-200 rounded-full h-1.5">
              <div
                className="bg-yellow-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${challanRefreshProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Stats Cards */}
        <div className="py-3">
          <MobileStatsCards metrics={metrics} />
        </div>

        {/* Vehicle Cards */}
        <div className="px-4 pb-4">
          {sortedDocumentMatrix.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-sm">No vehicles found</p>
              <p className="text-xs mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-0">
              {sortedDocumentMatrix.map((vehicle) => {
                const vehicleData = vehicles.find(v => v.id === vehicle.id);
                return (
                  <MobileVehicleCardNew
                    key={vehicle.id}
                    vehicle={vehicle}
                    vehicleData={vehicleData!}
                    onRefreshDocs={onRefreshVehicle}
                    onRefreshChallan={onRefreshChallan}
                    isRefreshingDocs={refreshingVehicles[vehicle.id] || false}
                    isRefreshingChallan={refreshingChallans[vehicle.id] || false}
                    onViewChallanDetails={onViewChallanDetails}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Charts Section */}
        <MobileChartsView
          monthlyExpenditure={monthlyExpenditure}
          vehicleExpenditure={vehicleExpenditure}
          isExpanded={chartsExpanded}
          onToggle={() => setChartsExpanded(!chartsExpanded)}
        />
      </div>

      {/* Filter Drawer */}
      <MobileFilterDrawer
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        dateRange={dateRange}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        vehicleFilter={vehicleFilter}
        documentTypeFilter={documentTypeFilter}
        setDateRange={setDateRange}
        setCustomStartDate={setCustomStartDate}
        setCustomEndDate={setCustomEndDate}
        setVehicleFilter={setVehicleFilter}
        setDocumentTypeFilter={setDocumentTypeFilter}
        onReset={handleResetFilters}
      />

      {/* Challan Info Modal */}
      {setShowChallanModal && (
        <ChallanInfoModal
          isOpen={showChallanModal}
          onClose={() => setShowChallanModal(false)}
          challanData={currentChallanData}
        />
      )}
    </div>
  );
};

