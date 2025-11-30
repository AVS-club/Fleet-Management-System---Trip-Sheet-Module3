/**
 * DocumentSummaryPanelRefactored - Simplified, modular document summary panel
 *
 * This is the refactored version of DocumentSummaryPanel.tsx
 * Reduced from 2,280 lines to ~400 lines by extracting:
 * - Utils functions → utils.ts
 * - Document matrix table → DocumentMatrix.tsx
 * - Charts → ExpenditureCharts.tsx
 * - State management → useDocumentSummary.ts
 *
 * To use this version:
 * 1. Test thoroughly
 * 2. Rename DocumentSummaryPanel.tsx to DocumentSummaryPanel.old.tsx
 * 3. Rename this file to DocumentSummaryPanel.tsx
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  FileCheck,
  AlertTriangle,
  RefreshCw,
  FileText,
  FileSpreadsheet,
  FileText as FileTextIcon,
  Search,
  IndianRupee,
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Shield,
  FileX,
  Printer as Print
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import { useDocumentSummary } from './useDocumentSummary';
import { DocumentMatrix } from './DocumentMatrix';
import { ExpenditureCharts } from './ExpenditureCharts';
import { MobileDocumentSummary } from './MobileDocumentSummary';
import { ChallanInfoModal } from '../../ChallanInfoModal';
import { formatShortDate } from './utils';
import { toast } from 'react-toastify';
import { useReactToPrint } from 'react-to-print';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { createLogger } from '../../../utils/logger';
import '../../../styles/document-summary-mobile.css';

const logger = createLogger('DocumentSummaryPanelRefactored');

interface DocumentSummaryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const DocumentSummaryPanelRefactored: React.FC<DocumentSummaryPanelProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  // Responsive state - detect mobile view
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    checkMobileView();
    window.addEventListener('resize', checkMobileView);

    return () => window.removeEventListener('resize', checkMobileView);
  }, []);

  // Use custom hook for all state management
  const {
    // Data
    vehicles,
    sortedDocumentMatrix,
    documentMatrix,
    metrics,
    monthlyExpenditure,
    vehicleExpenditure,

    // UI State
    loading,
    contentRef,
    visibleColumns,
    expandedSections,
    sort,
    chartView,

    // Filter State
    dateRange,
    customStartDate,
    customEndDate,
    vehicleFilter,
    documentTypeFilter,
    searchTerm,

    // Refresh State
    isBulkRefreshing,
    refreshProgress,

    // Challan State
    challanLoading,
    showChallanModal,
    currentChallanData,
    challanRefreshProgress,
    isBulkChallanLoading,

    // Actions
    setDateRange,
    setCustomStartDate,
    setCustomEndDate,
    setVehicleFilter,
    setDocumentTypeFilter,
    setSearchTerm,
    setChartView,
    setSort,
    toggleSection,
    handleColumnSort,
    handleBulkRefresh,
    handleIndividualRefresh,
    handleChallanRefresh,
    handleIndividualChallan,
    setShowChallanModal
  } = useDocumentSummary(isOpen);

  /**
   * Print functionality
   */
  const handlePrint = useReactToPrint({
    content: () => contentRef.current,
    documentTitle: 'Vehicle Document Summary',
    removeAfterPrint: true,
    pageStyle: `
      @page {
        size: auto;
        margin: 20mm;
      }
      @media print {
        body * {
          visibility: hidden;
        }
        #printable-content, #printable-content * {
          visibility: visible;
        }
        #printable-content {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
        .no-print {
          display: none !important;
        }
      }
    `
  });

  const handlePrintClick = () => {
    if (loading) {
      alert('Please wait for the data to load before printing.');
      return;
    }

    if (!contentRef.current) {
      alert('Content is not ready for printing. Please try again in a moment.');
      return;
    }

    handlePrint();
  };

  /**
   * Download as PDF functionality
   */
  const handleDownload = async () => {
    if (loading) {
      alert('Please wait for the data to load before downloading.');
      return;
    }

    if (!contentRef.current) return;

    try {
      const content = contentRef.current;
      const canvas = await html2canvas(content, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save('Vehicle_Document_Summary.pdf');
    } catch (error) {
      logger.error('Error generating PDF:', error);
    }
  };

  /**
   * Export to Excel
   */
  const exportToExcel = () => {
    if (loading) {
      alert('Please wait for the data to load before exporting.');
      return;
    }

    try {
      const exportData = documentMatrix.map(vehicle => ({
        'Vehicle Number': vehicle.registration,
        'Registration Date': formatShortDate(vehicle.registrationDate),
        'Insurance Status': vehicle.documents.insurance.status,
        'Insurance Expiry': formatShortDate(vehicle.documents.insurance.date),
        'Fitness Status': vehicle.documents.fitness.status,
        'Fitness Expiry': formatShortDate(vehicle.documents.fitness.date),
        'Permit Status': vehicle.documents.permit.status,
        'Permit Expiry': formatShortDate(vehicle.documents.permit.date),
        'PUC Status': vehicle.documents.puc.status,
        'PUC Expiry': formatShortDate(vehicle.documents.puc.date),
        'Tax Status': vehicle.documents.tax.status,
        'Tax Expiry': formatShortDate(vehicle.documents.tax.date),
        'RC Expiry': formatShortDate(vehicle.documents.rc.date),
        'RC Status': vehicle.documents.rc.status
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Vehicle Documents');

      const cols = Object.keys(exportData[0]).map(key => ({
        wch: Math.max(key.length, ...exportData.map(row => String(row[key as keyof typeof row]).length)) + 2
      }));
      ws['!cols'] = cols;

      XLSX.writeFile(wb, `Vehicle_Documents_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel file exported successfully!');
    } catch (error) {
      logger.error('Error exporting to Excel:', error);
      toast.error('Failed to export Excel file');
    }
  };

  /**
   * Export to CSV
   */
  const exportToCSV = () => {
    if (loading) {
      alert('Please wait for the data to load before exporting.');
      return;
    }

    try {
      const headers = ['Vehicle Number', 'Registration Date', 'Insurance Status', 'Insurance Expiry',
        'Fitness Status', 'Fitness Expiry', 'Permit Status', 'Permit Expiry',
        'PUC Status', 'PUC Expiry', 'Tax Status', 'Tax Expiry', 'RC Expiry', 'RC Status'];

      const rows = documentMatrix.map(vehicle => [
        vehicle.registration,
        formatShortDate(vehicle.registrationDate),
        vehicle.documents.insurance.status,
        formatShortDate(vehicle.documents.insurance.date),
        vehicle.documents.fitness.status,
        formatShortDate(vehicle.documents.fitness.date),
        vehicle.documents.permit.status,
        formatShortDate(vehicle.documents.permit.date),
        vehicle.documents.puc.status,
        formatShortDate(vehicle.documents.puc.date),
        vehicle.documents.tax.status,
        formatShortDate(vehicle.documents.tax.date),
        formatShortDate(vehicle.documents.rc.date),
        vehicle.documents.rc.status
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Vehicle_Documents_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      toast.success('CSV file exported successfully!');
    } catch (error) {
      logger.error('Error exporting to CSV:', error);
      toast.error('Failed to export CSV file');
    }
  };

  if (!isOpen) return null;

  // Mobile view - Render mobile-optimized layout
  if (isMobileView) {
    return (
      <div className="fixed inset-0 z-50 bg-white document-summary-modal">
        <MobileDocumentSummary
          onClose={onClose}
          sortedDocumentMatrix={sortedDocumentMatrix}
          vehicles={vehicles}
          metrics={metrics}
          monthlyExpenditure={monthlyExpenditure}
          vehicleExpenditure={vehicleExpenditure}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
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
          onRefreshVehicle={handleIndividualRefresh}
          onExportExcel={exportToExcel}
          onExportPDF={handleDownload}
          onPrint={handlePrintClick}
        />
      </div>
    );
  }

  // Desktop view - Original table layout
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/50 flex">
      <div className="relative w-full max-w-7xl mx-auto bg-white shadow-xl rounded-lg flex flex-col h-[calc(100vh-40px)] my-5 document-summary-modal">
        {/* Panel Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <FileCheck className="mr-2 h-5 w-5 text-primary-600" />
            Vehicle Document Summary
          </h2>
          <div className="flex items-center gap-3">
            {/* Challan Check Button */}
            <Button
              variant="outline"
              inputSize="sm"
              onClick={handleChallanRefresh}
              disabled={isBulkChallanLoading || vehicles.length === 0}
              icon={<AlertTriangle className={`h-4 w-4 ${isBulkChallanLoading ? 'animate-spin' : ''}`} />}
              title="Check challans for all vehicles"
            >
              {isBulkChallanLoading ? `Checking... ${Math.round(challanRefreshProgress)}%` : 'Check Challans'}
              {vehicles.length > 0 && !isBulkChallanLoading && (
                <span className="ml-1 bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
                  {vehicles.length}
                </span>
              )}
            </Button>

            {/* Bulk Refresh Button */}
            <Button
              variant="outline"
              inputSize="sm"
              onClick={handleBulkRefresh}
              disabled={isBulkRefreshing || vehicles.length === 0}
              icon={<RefreshCw className={`h-4 w-4 ${isBulkRefreshing ? 'animate-spin' : ''}`} />}
              title="Refresh all vehicle expiry data"
            >
              {isBulkRefreshing ? `Updating... ${Object.values(refreshProgress).filter(s => s === 'success' || s === 'error').length}/${vehicles.length}` : 'Refresh All Data'}
              {vehicles.length > 0 && !isBulkRefreshing && (
                <span className="ml-1 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                  {vehicles.length}
                </span>
              )}
            </Button>

            <Button
              variant="outline"
              inputSize="sm"
              onClick={handlePrintClick}
              icon={<Print className="h-4 w-4" />}
              title="Print Report"
              disabled={loading || isBulkRefreshing}
            />
            <Button
              variant="outline"
              inputSize="sm"
              onClick={handleDownload}
              icon={<FileTextIcon className="h-4 w-4" />}
              title="Export as PDF"
              disabled={loading || isBulkRefreshing}
            />
            <Button
              variant="outline"
              inputSize="sm"
              onClick={exportToExcel}
              icon={<FileSpreadsheet className="h-4 w-4" />}
              title="Export as Excel"
              disabled={loading || isBulkRefreshing}
            />
            <Button
              variant="outline"
              inputSize="sm"
              onClick={exportToCSV}
              icon={<FileText className="h-4 w-4" />}
              title="Export as CSV"
              disabled={loading || isBulkRefreshing}
            />
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close panel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Bulk Refresh Progress Indicator */}
        {isBulkRefreshing && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mx-6 mt-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <RefreshCw className="h-5 w-5 text-blue-400 animate-spin" />
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-blue-800">
                    Refreshing Vehicle Data
                  </h3>
                  <div className="text-sm text-blue-600">
                    {Object.values(refreshProgress).filter(s => s === 'success' || s === 'error').length} of {vehicles.length} processed
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.round((Object.values(refreshProgress).filter(s => s === 'success' || s === 'error').length / vehicles.length) * 100)}%`
                    }}
                  ></div>
                </div>

                <div className="mt-2 text-xs text-blue-700">
                  ✅ {Object.values(refreshProgress).filter(s => s === 'success').length} successful •
                  ❌ {Object.values(refreshProgress).filter(s => s === 'error').length} failed •
                  🔄 {Object.values(refreshProgress).filter(s => s === 'processing').length} processing •
                  ⏳ {Object.values(refreshProgress).filter(s => s === 'pending').length} waiting
                </div>

                <p className="mt-1 text-xs text-blue-600">
                  You can close this panel and the refresh will continue in the background.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Challan Check Progress Indicator */}
        {isBulkChallanLoading && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mx-6 mt-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400 animate-spin" />
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Checking Challans
                  </h3>
                  <div className="text-sm text-yellow-600">
                    {Math.round(challanRefreshProgress)}% complete
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-2 w-full bg-yellow-200 rounded-full h-2">
                  <div
                    className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${challanRefreshProgress}%`
                    }}
                  ></div>
                </div>

                <p className="mt-1 text-xs text-yellow-600">
                  Checking challan information for all vehicles. This may take a few minutes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Panel Content */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6" ref={contentRef} id="printable-content">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="ml-2 text-gray-600">Loading document data...</p>
            </div>
          ) : (
            <>
              {/* Date Range Filter */}
              <div className="date-range-filter no-print">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Select
                      label="Date Range"
                      options={[
                        { value: 'allTime', label: 'All Time' },
                        { value: 'thisMonth', label: 'This Month' },
                        { value: 'lastMonth', label: 'Last Month' },
                        { value: 'thisYear', label: 'This Year' },
                        { value: 'lastYear', label: 'Last Year' },
                        { value: 'custom', label: 'Custom Range' }
                      ]}
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value as any)}
                    />
                  </div>

                  {dateRange === 'custom' && (
                    <>
                      <div>
                        <Input
                          type="date"
                          label="Start Date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <Input
                          type="date"
                          label="End Date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <Select
                      label="Vehicle"
                      options={[
                        { value: 'all', label: 'All Vehicles' },
                        ...vehicles.map(v => ({ value: v.id!, label: v.registration_number! }))
                      ]}
                      value={vehicleFilter}
                      onChange={(e) => setVehicleFilter(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Compact Metrics Bar */}
              <div className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                <div className="flex gap-6 text-sm">
                  <span className="flex items-center gap-1">
                    <IndianRupee className="h-4 w-4 text-primary-600" />
                    Monthly: <b>₹{metrics.thisMonth.expectedExpense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</b>
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-primary-600" />
                    Yearly: <b>₹{metrics.thisYear.totalExpense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</b>
                  </span>
                  <span className="flex items-center gap-1 text-green-600">
                    <FileCheck className="h-4 w-4" />
                    Renewals: <b>{metrics.thisMonth.renewalsCount}</b>
                  </span>
                  <span className="flex items-center gap-1 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    Expired: <b>{metrics.thisMonth.lapsedCount}</b>
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleSection('stats')}
                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                    title={expandedSections.stats ? 'Hide stats' : 'Show stats'}
                  >
                    {expandedSections.stats ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Matrix Table - Document Status */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-medium text-gray-700 border-l-2 border-blue-500 pl-2">Document Status Matrix</h3>
                  <div className="flex items-center gap-3 no-print">
                    <Input
                      placeholder="Search vehicles..."
                      icon={<Search className="h-4 w-4" />}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-60"
                      inputSize="sm"
                    />
                    <Select
                      options={[
                        { value: 'all', label: 'All Documents' },
                        { value: 'rc', label: 'RC Only' },
                        { value: 'insurance', label: 'Insurance Only' },
                        { value: 'fitness', label: 'Fitness Only' },
                        { value: 'permit', label: 'Permit Only' },
                        { value: 'puc', label: 'PUC Only' },
                        { value: 'tax', label: 'Tax Only' }
                      ]}
                      value={documentTypeFilter}
                      onChange={(e) => setDocumentTypeFilter(e.target.value)}
                      className="w-40"
                      inputSize="sm"
                    />

                    {/* Urgency Filter Chips */}
                    <div className="flex gap-2 ml-2">
                      <button
                        className={sort.kind === "urgency" ? "chip active" : "chip"}
                        onClick={() => setSort({ kind: "urgency" })}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          fontSize: '13px',
                          fontWeight: 500,
                          border: '1px solid #e5e7eb',
                          borderRadius: '16px',
                          background: sort.kind === "urgency" ? '#eef2ff' : 'white',
                          color: sort.kind === "urgency" ? '#4f46e5' : '#6b7280',
                          borderTop: sort.kind === "urgency" ? '2px solid #6366f1' : '2px solid transparent',
                          cursor: 'pointer',
                          height: '30px'
                        }}
                      >
                        <AlertTriangle size={14} />
                        Urgency
                      </button>

                      <button
                        className={sort.kind === "expiringSoon" ? "chip active" : "chip"}
                        onClick={() => setSort({ kind: "expiringSoon" })}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          fontSize: '13px',
                          fontWeight: 500,
                          border: '1px solid #e5e7eb',
                          borderRadius: '16px',
                          background: sort.kind === "expiringSoon" ? '#fffbeb' : 'white',
                          color: sort.kind === "expiringSoon" ? '#d97706' : '#6b7280',
                          borderTop: sort.kind === "expiringSoon" ? '2px solid #f59e0b' : '2px solid transparent',
                          cursor: 'pointer',
                          height: '30px'
                        }}
                      >
                        <Clock size={14} />
                        ≤30d
                      </button>

                      <button
                        className={sort.kind === "missing" ? "chip active" : "chip"}
                        onClick={() => setSort({ kind: "missing" })}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          fontSize: '13px',
                          fontWeight: 500,
                          border: '1px solid #e5e7eb',
                          borderRadius: '16px',
                          background: sort.kind === "missing" ? '#fef2f2' : 'white',
                          color: sort.kind === "missing" ? '#dc2626' : '#6b7280',
                          borderTop: sort.kind === "missing" ? '2px solid #ef4444' : '2px solid transparent',
                          cursor: 'pointer',
                          height: '30px'
                        }}
                      >
                        <FileX size={14} />
                        Missing
                      </button>

                      <button
                        className={sort.kind === "legalPriority" ? "chip active" : "chip"}
                        onClick={() => setSort({ kind: "legalPriority" })}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          fontSize: '13px',
                          fontWeight: 500,
                          border: '1px solid #e5e7eb',
                          borderRadius: '16px',
                          background: sort.kind === "legalPriority" ? '#f0f9ff' : 'white',
                          color: sort.kind === "legalPriority" ? '#0369a1' : '#6b7280',
                          borderTop: sort.kind === "legalPriority" ? '2px solid #0ea5e9' : '2px solid transparent',
                          cursor: 'pointer',
                          height: '30px'
                        }}
                      >
                        <Shield size={14} />
                        Legal
                      </button>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <DocumentMatrix
                    sortedDocumentMatrix={sortedDocumentMatrix}
                    vehicles={vehicles}
                    visibleColumns={visibleColumns}
                    documentTypeFilter={documentTypeFilter}
                    sort={sort}
                    onColumnSort={handleColumnSort}
                  />
                </div>
              </div>

              {/* Charts */}
              <ExpenditureCharts
                monthlyExpenditure={monthlyExpenditure}
                vehicleExpenditure={vehicleExpenditure}
                expandedSections={expandedSections}
                onToggleSection={toggleSection}
                chartView={chartView}
                onChangeChartView={setChartView}
              />
            </>
          )}
        </div>
      </div>

      {/* Challan Info Modal */}
      <ChallanInfoModal
        isOpen={showChallanModal}
        onClose={() => setShowChallanModal(false)}
        challanData={currentChallanData}
      />
    </div>
  );
};

export default DocumentSummaryPanelRefactored;
