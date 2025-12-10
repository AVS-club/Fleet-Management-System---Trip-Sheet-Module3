import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Search, 
  Download, 
  RefreshCw,
  FileText,
  Info,
  XCircle,
  Truck,
  Hash,
  Calendar
} from 'lucide-react';
import { toast } from 'react-toastify';
import Layout from '../../components/layout/Layout';
import Button from '../../components/ui/Button';
import { 
  detectSerialMismatches, 
  formatMismatchReport,
  exportMismatchesAsCSV,
  SerialValidationReport,
  SerialMismatch
} from '../../utils/tripSerialValidator';
import { getUserActiveOrganization } from '../../utils/supaHelpers';
import { supabase } from '../../utils/supabaseClient';
import { createLogger } from '../../utils/logger';

const logger = createLogger('TripSerialValidationPage');

const TripSerialValidationPage: React.FC = () => {
  const [report, setReport] = useState<SerialValidationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [selectedMismatch, setSelectedMismatch] = useState<SerialMismatch | null>(null);

  // Load initial scan on mount
  useEffect(() => {
    handleScan();
  }, []);

  const handleScan = async () => {
    setScanning(true);
    try {
      // Get user's organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('User not authenticated');
        return;
      }

      const organizationId = await getUserActiveOrganization(user.id);
      if (!organizationId) {
        toast.error('No organization found');
        return;
      }

      logger.debug('Starting serial number validation scan...');
      const validationReport = await detectSerialMismatches(organizationId);
      setReport(validationReport);

      if (validationReport.mismatchedTrips === 0) {
        toast.success('✅ All trip serial numbers are valid!');
      } else {
        toast.warning(`⚠️ Found ${validationReport.mismatchedTrips} mismatched serial numbers`);
      }
    } catch (error) {
      logger.error('Error scanning for mismatches:', error);
      toast.error('Failed to scan for mismatches');
    } finally {
      setScanning(false);
    }
  };

  const handleDownloadReport = () => {
    if (!report) return;

    const formattedReport = formatMismatchReport(report);
    const blob = new Blob([formattedReport], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trip-serial-validation-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Report downloaded');
  };

  const handleDownloadCSV = () => {
    if (!report || report.mismatches.length === 0) return;

    const csv = exportMismatchesAsCSV(report.mismatches);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trip-serial-mismatches-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const getMismatchStatusColor = (wasModified: boolean) => {
    return wasModified 
      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' 
      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
  };

  const getMismatchStatusText = (wasModified: boolean) => {
    return wasModified 
      ? '⚠️ Modified After Creation' 
      : '📝 Created With Mismatch';
  };

  return (
    <Layout title="Trip Serial Number Validation">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Hash className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Trip Serial Number Validation
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Detect and report trips with mismatched serial numbers
                </p>
              </div>
            </div>
            <Button
              onClick={handleScan}
              isLoading={scanning}
              leftIcon={<RefreshCw className="h-4 w-4" />}
              variant="primary"
            >
              {scanning ? 'Scanning...' : 'Rescan'}
            </Button>
          </div>

          {/* Info Banner */}
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-medium mb-1">What This Tool Does:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
                  <li>Scans all trips to verify serial numbers match their assigned vehicles</li>
                  <li>Trip serial format: <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">T25-6089-0114</code> where <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">6089</code> should match vehicle registration</li>
                  <li>Identifies trips that may have had their vehicle changed after creation</li>
                  <li>Helps prevent odometer continuity violations and mileage calculation errors</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {report && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Trips</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                    {report.totalTrips}
                  </p>
                </div>
                <FileText className="h-10 w-10 text-gray-400" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Valid Serials</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                    {report.validTrips}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {((report.validTrips / report.totalTrips) * 100).toFixed(1)}%
                  </p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Mismatched</p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
                    {report.mismatchedTrips}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {((report.mismatchedTrips / report.totalTrips) * 100).toFixed(1)}%
                  </p>
                </div>
                <AlertTriangle className="h-10 w-10 text-red-500" />
              </div>
            </div>
          </div>
        )}

        {/* Export Actions */}
        {report && report.mismatches.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Export Reports
                </span>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleDownloadReport}
                  leftIcon={<FileText className="h-4 w-4" />}
                  variant="outline"
                  size="sm"
                >
                  Download Text Report
                </Button>
                <Button
                  onClick={handleDownloadCSV}
                  leftIcon={<Download className="h-4 w-4" />}
                  variant="outline"
                  size="sm"
                >
                  Export CSV
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Mismatches List */}
        {report && report.mismatches.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Mismatched Serial Numbers ({report.mismatches.length})
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                These trips have serial numbers that don't match their assigned vehicles
              </p>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {report.mismatches.map((mismatch, index) => (
                <div
                  key={mismatch.tripId}
                  className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-lg font-semibold text-gray-900 dark:text-white">
                          {index + 1}. {mismatch.tripSerialNumber}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getMismatchStatusColor(mismatch.wasModified)}`}>
                          {getMismatchStatusText(mismatch.wasModified)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                            <Truck className="h-4 w-4" />
                            <span className="font-medium">Vehicle Information</span>
                          </div>
                          <div className="pl-6 space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Registration:</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {mismatch.vehicleRegistration}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Vehicle Digits:</span>
                              <span className="font-mono font-medium text-gray-900 dark:text-white">
                                {mismatch.actualVehicleDigits}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Serial Digits:</span>
                              <span className="font-mono font-medium text-red-600 dark:text-red-400">
                                {mismatch.serialVehicleDigits}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                            <Calendar className="h-4 w-4" />
                            <span className="font-medium">Trip Details</span>
                          </div>
                          <div className="pl-6 space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Driver:</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {mismatch.driverName}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Date:</span>
                              <span className="text-gray-900 dark:text-white">
                                {new Date(mismatch.tripStartDate).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Created:</span>
                              <span className="text-gray-900 dark:text-white">
                                {new Date(mismatch.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Updated:</span>
                              <span className="text-gray-900 dark:text-white">
                                {new Date(mismatch.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {mismatch.wasModified && (
                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                          <div className="flex items-start gap-2 text-sm text-red-900 dark:text-red-100">
                            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium">Likely Vehicle Change Detected</p>
                              <p className="text-red-800 dark:text-red-200 mt-1">
                                This trip was modified after creation, suggesting the vehicle may have been changed.
                                This can cause odometer continuity issues and incorrect mileage calculations.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : report && report.mismatches.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                All Clear!
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                All trip serial numbers match their assigned vehicles. No mismatches found.
              </p>
            </div>
          </div>
        ) : null}

        {/* Warning Banner */}
        {report && report.mismatches.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-2">
                  What Should You Do?
                </h3>
                <div className="text-sm text-amber-800 dark:text-amber-200 space-y-2">
                  <p className="font-medium">For trips marked "Modified After Creation":</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>These trips likely had their vehicle changed after creation</li>
                    <li>The odometer readings are now associated with the wrong vehicle</li>
                    <li>Mileage calculations are comparing fuel efficiency across different vehicles</li>
                    <li><strong>Recommended action:</strong> Delete these trips and recreate them with the correct vehicle assignment</li>
                  </ul>
                  
                  <p className="font-medium mt-4">For trips "Created With Mismatch":</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>These may be from data imports or manual serial number entries</li>
                    <li>Verify the vehicle assignment is correct</li>
                    <li>If incorrect, delete and recreate with proper vehicle</li>
                  </ul>

                  <div className="mt-4 p-3 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                    <p className="font-semibold text-amber-900 dark:text-amber-100">⚠️ Important:</p>
                    <p className="mt-1">
                      Vehicle changes on existing trips are now prevented by the system to maintain data integrity.
                      You must delete incorrect trips and create new ones with the correct vehicle assignment.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default TripSerialValidationPage;










