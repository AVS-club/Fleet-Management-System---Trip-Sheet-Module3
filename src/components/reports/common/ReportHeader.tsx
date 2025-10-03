import React from 'react';

interface ReportHeaderProps {
  title: string;
  subtitle?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  logo?: string;
  additionalInfo?: React.ReactNode;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  title,
  subtitle,
  dateRange,
  logo = "/assets/AVS-LOGO-512x512.png",
  additionalInfo
}) => {
  return (
    <div className="report-header bg-gradient-to-r from-green-50 to-white p-6 rounded-t-lg border-b">
      <div className="flex justify-between items-start">
        <div>
          <img src={logo} alt="Auto Vital Solution" className="h-12 mb-3" />
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          )}
          {dateRange && (
            <p className="text-xs text-gray-500 mt-1">
              {dateRange.start} to {dateRange.end}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Generated on</p>
          <p className="text-sm font-medium">{new Date().toLocaleDateString()}</p>
          {additionalInfo}
        </div>
      </div>
    </div>
  );
};
