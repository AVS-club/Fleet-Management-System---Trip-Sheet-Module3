/**
 * MobileChartsView - Mobile-optimized charts display
 * 
 * Features:
 * - Vertically stacked charts
 * - Collapsible sections
 * - Responsive chart sizing
 * - Simplified legends
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, BarChart2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { DOC_TYPE_COLORS } from './utils';

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

interface MobileChartsViewProps {
  monthlyExpenditure: MonthlyExpenditure[];
  vehicleExpenditure: VehicleExpenditure[];
  isExpanded: boolean;
  onToggle: () => void;
}

export const MobileChartsView: React.FC<MobileChartsViewProps> = ({
  monthlyExpenditure,
  vehicleExpenditure,
  isExpanded,
  onToggle
}) => {
  // Calculate total expenditure
  const totalExpenditure = monthlyExpenditure.reduce((sum, month) =>
    sum + month.rc + month.insurance + month.fitness + month.permit + month.puc + month.tax + month.other, 0
  );

  // Calculate average
  const averageMonthly = totalExpenditure / (monthlyExpenditure.length || 1);

  // Get top 5 vehicles by expenditure
  const topVehicles = vehicleExpenditure
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return (
    <div className="mobile-charts-section">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-white border-y border-gray-200 touch-manipulation active:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-primary-600" />
          <h3 className="text-base font-semibold text-gray-900">
            Charts & Analytics
          </h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {/* Charts Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-gray-50"
          >
            <div className="px-4 py-4 space-y-4">
              {/* Summary Stats */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Summary</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total (12 months)</p>
                    <p className="text-lg font-bold text-gray-900">
                      ₹{(totalExpenditure / 1000).toFixed(0)}k
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Avg/Month</p>
                    <p className="text-lg font-bold text-gray-900">
                      ₹{(averageMonthly / 1000).toFixed(0)}k
                    </p>
                  </div>
                </div>
              </div>

              {/* Monthly Expenditure Chart */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Monthly Expenditure
                </h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyExpenditure}
                      margin={{ top: 10, right: 10, left: -10, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 10 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        tickFormatter={(value) => {
                          if (value === 0) return '0';
                          if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
                          if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                          return value;
                        }}
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip
                        formatter={(value: any) => `₹${Number(value).toLocaleString('en-IN')}`}
                        contentStyle={{
                          fontSize: '12px',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb'
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                        iconSize={8}
                      />
                      <Bar dataKey="insurance" stackId="a" fill={DOC_TYPE_COLORS.insurance} name="Insurance" />
                      <Bar dataKey="fitness" stackId="a" fill={DOC_TYPE_COLORS.fitness} name="Fitness" />
                      <Bar dataKey="permit" stackId="a" fill={DOC_TYPE_COLORS.permit} name="Permit" />
                      <Bar dataKey="puc" stackId="a" fill={DOC_TYPE_COLORS.puc} name="PUC" />
                      <Bar dataKey="tax" stackId="a" fill={DOC_TYPE_COLORS.tax} name="Tax" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Vehicles by Expenditure */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Top Vehicles by Cost
                </h4>
                <div className="space-y-2">
                  {topVehicles.map((vehicle, index) => {
                    const percentage = (vehicle.amount / topVehicles[0].amount) * 100;
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-24 text-xs font-medium text-gray-700 truncate">
                          {vehicle.vehicle}
                        </div>
                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-end pr-2"
                            style={{ width: `${percentage}%` }}
                          >
                            <span className="text-xs font-semibold text-white">
                              ₹{(vehicle.amount / 1000).toFixed(0)}k
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Legend */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Status Legend</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-success-100 border border-success-200" />
                    <span className="text-gray-600">Valid</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-warning-100 border border-warning-200" />
                    <span className="text-gray-600">Expiring</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-error-100 border border-error-200" />
                    <span className="text-gray-600">Expired</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gray-100 border border-gray-200" />
                    <span className="text-gray-600">Missing</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

