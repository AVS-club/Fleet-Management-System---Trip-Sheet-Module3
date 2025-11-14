import React, { useState } from 'react';
import { ReportGenerator, ReportType } from '../components/reports/ReportGenerator';
import { 
  Calendar, 
  TrendingUp, 
  FileText, 
  Car, 
  Users, 
  Download,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';

interface ReportCard {
  id: ReportType;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  category: 'comparison' | 'summary' | 'performance';
}

const ReportsPage: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [showLess, setShowLess] = useState(false);

  const reportCards: ReportCard[] = [
    {
      id: 'weekly-comparison',
      title: 'Weekly Comparison',
      description: 'This week vs last week',
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'bg-green-500',
      category: 'comparison'
    },
    {
      id: 'monthly-comparison',
      title: 'Monthly Comparison',
      description: 'Month-over-month analysis',
      icon: <BarChart3 className="w-6 h-6" />,
      color: 'bg-green-500',
      category: 'comparison'
    },
    {
      id: 'yearly-comparison',
      title: 'Yearly Comparison',
      description: 'Year-over-year analysis',
      icon: <Calendar className="w-6 h-6" />,
      color: 'bg-green-500',
      category: 'comparison'
    },
    {
      id: 'trip-summary',
      title: 'Trip Summary',
      description: 'All trip details',
      icon: <FileText className="w-6 h-6" />,
      color: 'bg-purple-500',
      category: 'summary'
    },
    {
      id: 'vehicle-utilization',
      title: 'Vehicle Utilization',
      description: 'Vehicle usage patterns',
      icon: <Car className="w-6 h-6" />,
      color: 'bg-purple-500',
      category: 'summary'
    },
    {
      id: 'expense-report',
      title: 'Expense Report',
      description: 'Detailed expense breakdown',
      icon: <PieChart className="w-6 h-6" />,
      color: 'bg-purple-500',
      category: 'summary'
    },
    {
      id: 'fuel-analysis',
      title: 'Fuel Analysis',
      description: 'Fuel consumption & costs',
      icon: <Activity className="w-6 h-6" />,
      color: 'bg-blue-500',
      category: 'performance'
    },
    {
      id: 'driver-performance',
      title: 'Driver Performance',
      description: 'Driver efficiency metrics',
      icon: <Users className="w-6 h-6" />,
      color: 'bg-blue-500',
      category: 'performance'
    },
    {
      id: 'compliance-report',
      title: 'Compliance Report',
      description: 'Document expiry tracking',
      icon: <FileText className="w-6 h-6" />,
      color: 'bg-blue-500',
      category: 'performance'
    }
  ];

  const quickDownloads = reportCards.slice(0, showLess ? 3 : 10);
  const comparisonReports = reportCards.filter(r => r.category === 'comparison');
  const summaryReports = reportCards.filter(r => r.category === 'summary');
  const performanceReports = reportCards.filter(r => r.category === 'performance');

  const handleReportClick = (reportType: ReportType) => {
    setSelectedReport(reportType);
  };

  const handleCloseReport = () => {
    setSelectedReport(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Activity className="w-8 h-8 text-green-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reports</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">Auto Vital Solution</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Downloads Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Quick Downloads</h2>
            <div className="flex items-center space-x-2">
              <Download className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Generate reports instantly</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickDownloads.map((report) => (
              <div
                key={report.id}
                onClick={() => handleReportClick(report.id)}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 cursor-pointer hover:shadow-md hover:border-green-300 dark:hover:border-green-600 transition-all duration-200 group"
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg ${report.color} text-white group-hover:scale-110 transition-transform duration-200`}>
                    {report.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-green-600 transition-colors">
                      {report.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{report.description}</p>
                    <div className="flex items-center text-green-600 dark:text-green-500 text-sm font-medium">
                      <Download className="w-4 h-4 mr-1" />
                      Generate Report
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {reportCards.length > 3 && (
            <div className="text-center mt-6">
              <button
                onClick={() => setShowLess(!showLess)}
                className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                {showLess ? (
                  <>
                    Show More
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                ) : (
                  <>
                    Show Less
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Categorized Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Smart Comparisons */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-4">
              <TrendingUp className="w-6 h-6 text-green-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Smart Comparisons</h3>
            </div>
            <div className="space-y-3">
              {comparisonReports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => handleReportClick(report.id)}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors group"
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-green-600">
                    {report.title}
                  </span>
                  <Download className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-green-600" />
                </div>
              ))}
            </div>
          </div>

          {/* Operations Reports */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-4">
              <PieChart className="w-6 h-6 text-purple-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Operations Reports</h3>
            </div>
            <div className="space-y-3">
              {summaryReports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => handleReportClick(report.id)}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors group"
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-purple-600">
                    {report.title}
                  </span>
                  <Download className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-purple-600" />
                </div>
              ))}
            </div>
          </div>

          {/* Performance Reports */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-4">
              <BarChart3 className="w-6 h-6 text-blue-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Performance Reports</h3>
            </div>
            <div className="space-y-3">
              {performanceReports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => handleReportClick(report.id)}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors group"
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600">
                    {report.title}
                  </span>
                  <Download className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-blue-600" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Report Features */}
        <div className="mt-12 bg-gradient-to-r from-green-50 to-blue-50 dark:from-gray-800 dark:to-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Comprehensive Reporting</h2>
            <p className="text-gray-600 dark:text-gray-400">Generate detailed reports with PDF and Excel export capabilities</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">PDF Export</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">High-quality PDF reports with professional formatting</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Excel Export</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Detailed data in Excel format for further analysis</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Real-time Data</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Always up-to-date information from your fleet</p>
            </div>
          </div>
        </div>
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

export default ReportsPage;
