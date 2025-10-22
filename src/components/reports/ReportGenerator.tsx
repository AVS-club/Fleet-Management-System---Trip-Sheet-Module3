import React, { useState, useEffect, useCallback } from 'react';
import { 
  generatePDF, 
  generateWeeklyComparisonExcel, 
  generateTripSummaryExcel, 
  generateVehicleUtilizationExcel, 
  generateDriverPerformanceExcel, 
  generateMonthlyComparisonExcel 
} from '../../utils/reportGenerators';
import {
  fetchWeeklyComparisonData,
  fetchMonthlyComparisonData,
  fetchTripSummaryData,
  fetchVehicleUtilizationData,
  fetchDriverPerformanceData,
  WeeklyComparisonData,
  MonthlyComparisonData,
  TripSummaryData,
  VehicleUtilizationData,
  DriverPerformanceData
} from '../../utils/reportDataFetchers';

// Import report templates
import { WeeklyComparisonReport } from './templates/WeeklyComparisonReport';
import { MonthlyComparisonReport } from './templates/MonthlyComparisonReport';
import { TripSummaryReport } from './templates/TripSummaryReport';
import { VehicleUtilizationReport } from './templates/VehicleUtilizationReport';
import { DriverPerformanceReport } from './templates/DriverPerformanceReport';

import { Download, FileText, Table, X, Loader2, Calendar, Filter } from 'lucide-react';
import { createLogger } from '../../utils/logger';

const logger = createLogger('ReportGenerator');

export type ReportType = 
  | 'weekly-comparison'
  | 'monthly-comparison'
  | 'trip-summary'
  | 'vehicle-utilization'
  | 'driver-performance';

interface ReportGeneratorProps {
  reportType: ReportType;
  onClose: () => void;
  initialDateRange?: {
    start: string;
    end: string;
  };
}

interface DateRange {
  start: string;
  end: string;
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  reportType,
  onClose,
  initialDateRange
}) => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(
    initialDateRange || {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    }
  );
  const [customDateRange, setCustomDateRange] = useState(false);

  // Report type configurations
  const reportConfigs = {
    'weekly-comparison': {
      title: 'Weekly Comparison Report',
      description: 'Compare current week performance with previous week',
      icon: <Calendar className="w-5 h-5" />,
      color: 'bg-green-500'
    },
    'monthly-comparison': {
      title: 'Monthly Comparison Report',
      description: 'Monthly performance analysis and trends',
      icon: <Calendar className="w-5 h-5" />,
      color: 'bg-blue-500'
    },
    'trip-summary': {
      title: 'Trip Summary Report',
      description: 'Detailed trip information and statistics',
      icon: <FileText className="w-5 h-5" />,
      color: 'bg-purple-500'
    },
    'vehicle-utilization': {
      title: 'Vehicle Utilization Report',
      description: 'Vehicle usage patterns and efficiency metrics',
      icon: <Table className="w-5 h-5" />,
      color: 'bg-orange-500'
    },
    'driver-performance': {
      title: 'Driver Performance Report',
      description: 'Driver performance metrics and safety analysis',
      icon: <Table className="w-5 h-5" />,
      color: 'bg-indigo-500'
    }
  };

  const config = reportConfigs[reportType];

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let data: any;
      
      switch (reportType) {
        case 'weekly-comparison': {
          const currentWeek = getWeekNumber(new Date());
          data = await fetchWeeklyComparisonData(currentWeek);
          break;
        }
        case 'monthly-comparison': {
          const currentMonth = new Date().getMonth() + 1;
          data = await fetchMonthlyComparisonData(currentMonth);
          break;
        }
        case 'trip-summary':
          data = await fetchTripSummaryData(dateRange);
          break;
        case 'vehicle-utilization':
          data = await fetchVehicleUtilizationData('Current Month');
          break;
        case 'driver-performance':
          data = await fetchDriverPerformanceData('Current Month');
          break;
        default:
          throw new Error(`Unknown report type: ${reportType}`);
      }
      
      setReportData(data);
    } catch (err) {
      logger.error('Error fetching report data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  }, [reportType, dateRange]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const handleDownloadPDF = async () => {
    try {
      setLoading(true);
      const fileName = `${reportType.replace('-', '_')}_${new Date().getTime()}`;
      await generatePDF('report-content', fileName, {
        orientation: 'portrait',
        format: 'a4',
        margin: 20,
        scale: 2
      });
    } catch (err) {
      logger.error('Error generating PDF:', err);
      setError('Failed to generate PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = () => {
    try {
      const fileName = `${reportType.replace('-', '_')}_${new Date().getTime()}`;
      
      switch (reportType) {
        case 'weekly-comparison':
          generateWeeklyComparisonExcel(reportData);
          break;
        case 'monthly-comparison':
          generateMonthlyComparisonExcel(reportData);
          break;
        case 'trip-summary':
          generateTripSummaryExcel(reportData);
          break;
        case 'vehicle-utilization':
          generateVehicleUtilizationExcel(reportData);
          break;
        case 'driver-performance':
          generateDriverPerformanceExcel(reportData);
          break;
        default:
          throw new Error(`Unknown report type: ${reportType}`);
      }
    } catch (err) {
      logger.error('Error generating Excel:', err);
      setError('Failed to generate Excel file');
    }
  };

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const renderReport = () => {
    if (!reportData) return null;

    switch (reportType) {
      case 'weekly-comparison':
        return <WeeklyComparisonReport data={reportData} />;
      case 'monthly-comparison':
        return <MonthlyComparisonReport data={reportData} />;
      case 'trip-summary':
        return <TripSummaryReport data={reportData} />;
      case 'vehicle-utilization':
        return <VehicleUtilizationReport data={reportData} />;
      case 'driver-performance':
        return <DriverPerformanceReport data={reportData} />;
      default:
        return null;
    }
  };

  const needsDateRange = ['trip-summary'].includes(reportType);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.color} text-white`}>
              {config.icon}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{config.title}</h2>
              <p className="text-sm text-gray-600">{config.description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Date Range Selector for applicable reports */}
            {needsDateRange && (
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => handleDateRangeChange('start', e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => handleDateRangeChange('end', e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <button
              onClick={handleDownloadPDF}
              disabled={loading || !reportData}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              PDF
            </button>
            
            <button
              onClick={handleDownloadExcel}
              disabled={loading || !reportData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Table className="w-4 h-4" />}
              Excel
            </button>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading && !reportData ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-600" />
                <p className="text-gray-600">Generating report...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Report</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={fetchReportData}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <div id="report-content" className="p-6">
              {renderReport()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
