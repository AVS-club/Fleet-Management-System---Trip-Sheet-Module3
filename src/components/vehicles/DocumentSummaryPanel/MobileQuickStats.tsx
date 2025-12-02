/**
 * MobileQuickStats - Horizontal status pills showing document counts
 * 
 * Features:
 * - Color-coded status indicators
 * - Compact, pill-style design
 * - Quick visual summary
 */

import React from 'react';
import { AlertCircle, Clock, CheckCircle, FileX } from 'lucide-react';

interface MobileQuickStatsProps {
  expired: number;
  expiring: number;
  valid: number;
  missing: number;
}

export const MobileQuickStats: React.FC<MobileQuickStatsProps> = ({
  expired,
  expiring,
  valid,
  missing
}) => {
  const stats = [
    {
      count: expired,
      label: 'Expired',
      icon: AlertCircle,
      bgColor: 'bg-error-100',
      textColor: 'text-error-700',
      borderColor: 'border-error-300',
      show: expired > 0
    },
    {
      count: expiring,
      label: 'Expiring',
      icon: Clock,
      bgColor: 'bg-warning-100',
      textColor: 'text-warning-700',
      borderColor: 'border-warning-300',
      show: expiring > 0
    },
    {
      count: valid,
      label: 'Valid',
      icon: CheckCircle,
      bgColor: 'bg-success-100',
      textColor: 'text-success-700',
      borderColor: 'border-success-300',
      show: valid > 0
    },
    {
      count: missing,
      label: 'Missing',
      icon: FileX,
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-700',
      borderColor: 'border-gray-300',
      show: missing > 0
    }
  ];

  // Only show stats that have counts
  const visibleStats = stats.filter(stat => stat.show);

  if (visibleStats.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 px-4 py-2">
      {visibleStats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${stat.bgColor} ${stat.textColor} ${stat.borderColor}`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold">{stat.count}</span>
            <span className="text-xs font-medium">{stat.label}</span>
          </div>
        );
      })}
    </div>
  );
};

