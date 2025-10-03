import React, { useState } from 'react';
import { ReportGenerator, ReportType } from './ReportGenerator';
import { Button } from '../ui/button';

/**
 * Demo component showing how to use the Reports system
 * This can be used for testing or as an example implementation
 */
export const ReportsDemo: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);

  const reportTypes: { type: ReportType; label: string; description: string }[] = [
    {
      type: 'weekly-comparison',
      label: 'Weekly Comparison',
      description: 'Compare current week with previous week performance'
    },
    {
      type: 'monthly-comparison',
      label: 'Monthly Comparison',
      description: 'Monthly performance analysis and trends'
    },
    {
      type: 'trip-summary',
      label: 'Trip Summary',
      description: 'Detailed trip information and statistics'
    },
    {
      type: 'vehicle-utilization',
      label: 'Vehicle Utilization',
      description: 'Vehicle usage patterns and efficiency metrics'
    },
    {
      type: 'driver-performance',
      label: 'Driver Performance',
      description: 'Driver performance metrics and safety analysis'
    }
  ];

  const handleReportClick = (reportType: ReportType) => {
    setSelectedReport(reportType);
  };

  const handleCloseReport = () => {
    setSelectedReport(null);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports System Demo</h1>
        <p className="text-gray-600">
          Click on any report type below to generate and preview the report.
          You can then download it as PDF or Excel.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {reportTypes.map((report) => (
          <div
            key={report.type}
            className="p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:shadow-md transition-all cursor-pointer"
            onClick={() => handleReportClick(report.type)}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {report.label}
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              {report.description}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
            >
              Generate Report
            </Button>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Usage Instructions</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Click on any report type to open the report generator</li>
          <li>• The system will fetch real data from your Supabase database</li>
          <li>• Use the date range picker for trip summary reports</li>
          <li>• Download reports as PDF or Excel files</li>
          <li>• All reports are optimized for both screen and print</li>
        </ul>
      </div>

      {/* Report Generator Modal */}
      {selectedReport && (
        <ReportGenerator
          reportType={selectedReport}
          onClose={handleCloseReport}
        />
      )}
    </div>
  );
};
