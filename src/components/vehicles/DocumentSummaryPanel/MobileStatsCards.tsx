/**
 * MobileStatsCards - Horizontally scrollable statistics cards for mobile
 * 
 * Features:
 * - Touch-friendly horizontal scrolling
 * - Color-coded metric cards
 * - Compact, information-dense design
 */

import React from 'react';
import { AlertCircle, Clock, CheckCircle, FileX, FileText } from 'lucide-react';

interface Metrics {
  totalVehicles: number;
  expiredDocs: number;
  expiringSoon: number;
  validDocs: number;
  missingDocs: number;
}

interface MobileStatsCardsProps {
  metrics: Metrics;
}

export const MobileStatsCards: React.FC<MobileStatsCardsProps> = ({ metrics }) => {
  const stats = [
    {
      label: 'Total',
      value: metrics.totalVehicles,
      icon: FileText,
      color: 'bg-blue-50 border-blue-200 text-blue-700',
      iconColor: 'text-blue-600'
    },
    {
      label: 'Expired',
      value: metrics.expiredDocs,
      icon: AlertCircle,
      color: 'bg-error-50 border-error-200 text-error-700',
      iconColor: 'text-error-600'
    },
    {
      label: 'Expiring',
      value: metrics.expiringSoon,
      icon: Clock,
      color: 'bg-warning-50 border-warning-200 text-warning-700',
      iconColor: 'text-warning-600'
    },
    {
      label: 'Valid',
      value: metrics.validDocs,
      icon: CheckCircle,
      color: 'bg-success-50 border-success-200 text-success-700',
      iconColor: 'text-success-600'
    },
    {
      label: 'Missing',
      value: metrics.missingDocs,
      icon: FileX,
      color: 'bg-gray-50 border-gray-200 text-gray-700',
      iconColor: 'text-gray-600'
    }
  ];

  return (
    <div className="mobile-stats-container">
      <div className="flex gap-3 overflow-x-auto pb-2 px-4 scrollbar-hide snap-x snap-mandatory">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className={`flex-shrink-0 snap-start w-28 p-3 rounded-lg border-2 ${stat.color} shadow-sm`}
            >
              <div className="flex flex-col items-center text-center">
                <Icon className={`h-5 w-5 mb-1 ${stat.iconColor}`} />
                <div className="text-2xl font-bold mb-0.5">
                  {stat.value}
                </div>
                <div className="text-xs font-medium">
                  {stat.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .mobile-stats-container {
          -webkit-overflow-scrolling: touch;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

