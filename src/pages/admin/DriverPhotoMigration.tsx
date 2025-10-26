import React, { useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { getDrivers, updateDriver } from '../../utils/api/drivers';
import { Driver } from '../../types';
import Layout from '../../components/layout/Layout';
import Button from '../../components/ui/Button';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'react-toastify';

interface MigrationResult {
  driver: Driver;
  status: 'pending' | 'checking' | 'success' | 'failed' | 'skipped';
  message: string;
  photoFound?: boolean;
  storagePath?: string;
}

const DriverPhotoMigration: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [results, setResults] = useState<MigrationResult[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    withDataUrls: 0,
    withStoragePaths: 0,
    withNull: 0,
    photosFound: 0,
    updated: 0,
    failed: 0
  });

  const scanDrivers = async () => {
    setIsScanning(true);
    setResults([]);

    try {
      // Fetch all drivers
      const drivers = await getDrivers();

      if (!drivers || drivers.length === 0) {
        toast.info('No drivers found to scan');
        setIsScanning(false);
        return;
      }

      const scanResults: MigrationResult[] = [];
      const stats = {
        total: drivers.length,
        withDataUrls: 0,
        withStoragePaths: 0,
        withNull: 0,
        photosFound: 0,
        updated: 0,
        failed: 0
      };

      for (const driver of drivers) {
        const photoUrl = driver.driver_photo_url;
        let result: MigrationResult = {
          driver,
          status: 'pending',
          message: ''
        };

        if (!photoUrl) {
          result.status = 'skipped';
          result.message = 'No photo URL';
          stats.withNull++;
        } else if (photoUrl.startsWith('data:')) {
          result.status = 'pending';
          result.message = 'Has data URL (needs migration)';
          stats.withDataUrls++;
        } else if (photoUrl.startsWith('http')) {
          result.status = 'skipped';
          result.message = 'Has full URL (already migrated or public)';
          stats.withStoragePaths++;
        } else {
          // It's a storage path - check if file exists
          result.status = 'checking';
          result.message = 'Checking if photo exists in storage...';

          try {
            const { data, error } = await supabase.storage
              .from('driver-photos')
              .list('drivers', {
                search: `${driver.id}.`
              });

            if (!error && data && data.length > 0) {
              result.photoFound = true;
              result.storagePath = `drivers/${data[0].name}`;
              result.status = 'pending';
              result.message = `Photo found in storage: ${data[0].name}`;
              stats.photosFound++;
            } else {
              result.status = 'skipped';
              result.message = 'Storage path exists but no photo found';
            }
          } catch (error) {
            result.status = 'failed';
            result.message = `Error checking storage: ${error}`;
          }

          stats.withStoragePaths++;
        }

        scanResults.push(result);
      }

      setResults(scanResults);
      setSummary(stats);
      toast.success(`Scanned ${drivers.length} drivers`);
    } catch (error) {
      console.error('Error scanning drivers:', error);
      toast.error('Failed to scan drivers');
    } finally {
      setIsScanning(false);
    }
  };

  const runMigration = async () => {
    setIsMigrating(true);
    const updatedResults = [...results];
    let successCount = 0;
    let failCount = 0;

    try {
      for (let i = 0; i < updatedResults.length; i++) {
        const result = updatedResults[i];

        // Skip if already processed or not pending
        if (result.status !== 'pending') {
          continue;
        }

        try {
          const photoUrl = result.driver.driver_photo_url;

          // Case 1: Has data URL - cannot migrate without re-fetching from API
          if (photoUrl && photoUrl.startsWith('data:')) {
            result.status = 'failed';
            result.message = 'Cannot migrate data URL automatically. Please re-fetch from API and save.';
            failCount++;
          }
          // Case 2: Has storage path and photo found
          else if (result.photoFound && result.storagePath) {
            // Update the database with the correct storage path
            await updateDriver(result.driver.id!, {
              driver_photo_url: result.storagePath
            });

            result.status = 'success';
            result.message = `Updated to storage path: ${result.storagePath}`;
            successCount++;
          }
          else {
            result.status = 'skipped';
            result.message = 'No action needed';
          }
        } catch (error) {
          result.status = 'failed';
          result.message = `Migration failed: ${error}`;
          failCount++;
        }

        setResults([...updatedResults]);
      }

      setSummary(prev => ({
        ...prev,
        updated: successCount,
        failed: failCount
      }));

      toast.success(`Migration complete! Updated: ${successCount}, Failed: ${failCount}`);
    } catch (error) {
      console.error('Migration error:', error);
      toast.error('Migration failed');
    } finally {
      setIsMigrating(false);
    }
  };

  const getStatusIcon = (status: MigrationResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'checking':
        return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'pending':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <div className="h-5 w-5" />;
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            Driver Photo Migration Tool
          </h1>

          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h2 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">What this tool does:</h2>
            <ul className="list-disc list-inside text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>Scans all drivers in your organization</li>
              <li>Identifies drivers with broken photo URLs (data URLs or missing photos)</li>
              <li>Checks if photos exist in Supabase Storage</li>
              <li>Updates database with correct storage paths</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mb-6">
            <Button
              onClick={scanDrivers}
              disabled={isScanning || isMigrating}
              isLoading={isScanning}
              icon={<RefreshCw className="h-4 w-4" />}
            >
              {isScanning ? 'Scanning...' : 'Scan Drivers'}
            </Button>

            {results.length > 0 && (
              <Button
                onClick={runMigration}
                disabled={isMigrating || isScanning}
                isLoading={isMigrating}
                variant="primary"
              >
                {isMigrating ? 'Migrating...' : `Migrate ${results.filter(r => r.status === 'pending').length} Drivers`}
              </Button>
            )}
          </div>

          {/* Summary Stats */}
          {results.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summary.total}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Drivers</div>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{summary.withDataUrls}</div>
                <div className="text-sm text-yellow-700 dark:text-yellow-300">With Data URLs</div>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-900 dark:text-green-100">{summary.photosFound}</div>
                <div className="text-sm text-green-700 dark:text-green-300">Photos Found</div>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{summary.updated}</div>
                <div className="text-sm text-blue-700 dark:text-blue-300">Updated</div>
              </div>
            </div>
          )}

          {/* Results Table */}
          {results.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Driver
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      License
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Message
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {results.map((result, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getStatusIcon(result.status)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {result.driver.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {result.driver.license_number || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {result.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default DriverPhotoMigration;
