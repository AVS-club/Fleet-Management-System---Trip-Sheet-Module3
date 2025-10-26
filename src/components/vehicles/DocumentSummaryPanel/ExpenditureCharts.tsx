/**
 * ExpenditureCharts - Charts showing document expenditure
 *
 * Features:
 * - Monthly expenditure over time (stacked bar chart)
 * - Expenditure by vehicle (horizontal bar chart)
 * - Collapsible charts
 * - Summary statistics
 */

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ChevronUp, ChevronDown } from 'lucide-react';
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

interface ExpenditureChartsProps {
  monthlyExpenditure: MonthlyExpenditure[];
  vehicleExpenditure: VehicleExpenditure[];
  expandedSections: { charts: boolean };
  onToggleSection: (section: string) => void;
  chartView: 'monthly' | 'yearly';
  onChangeChartView: (view: 'monthly' | 'yearly') => void;
}

export const ExpenditureCharts: React.FC<ExpenditureChartsProps> = ({
  monthlyExpenditure,
  vehicleExpenditure,
  expandedSections,
  onToggleSection,
  chartView,
  onChangeChartView
}) => {
  /**
   * Calculate total expenditure
   */
  const totalExpenditure = monthlyExpenditure.reduce((sum, month) =>
    sum + month.rc + month.insurance + month.fitness + month.permit + month.puc + month.tax + month.other, 0
  );

  /**
   * Calculate average monthly expenditure
   */
  const averageMonthly = totalExpenditure / 12;

  /**
   * Find peak month
   */
  const peakMonth = monthlyExpenditure.reduce((max, month) => {
    const monthTotal = month.rc + month.insurance + month.fitness + month.permit + month.puc + month.tax + month.other;
    const maxTotal = max.rc + max.insurance + max.fitness + max.permit + max.puc + max.tax + max.other;
    return monthTotal > maxTotal ? month : max;
  });

  return (
    <>
      {/* Expenditure Over Time Chart - Collapsible */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 text-lg">Documentation Expenditure Over Time</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center space-x-2 no-print">
              <button
                onClick={() => onChangeChartView('monthly')}
                className={`px-3 py-1 text-xs rounded-md ${chartView === 'monthly'
                  ? 'bg-primary-100 text-primary-700 font-medium'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                Monthly
              </button>
              <button
                onClick={() => onChangeChartView('yearly')}
                className={`px-3 py-1 text-xs rounded-md ${chartView === 'yearly'
                  ? 'bg-primary-100 text-primary-700 font-medium'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                Yearly
              </button>
            </div>
            <button
              onClick={() => onToggleSection('charts')}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
              title={expandedSections.charts ? 'Hide charts' : 'Show charts'}
            >
              {expandedSections.charts ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {expandedSections.charts && (
          <div className="p-6">
            {/* Stacked Bar Chart */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyExpenditure}
                  margin={{ top: 20, right: 30, left: 50, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tickFormatter={(value) => {
                      if (value === 0) return '₹0';
                      if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
                      if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
                      return `₹${value}`;
                    }}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: any, name: string) => {
                      const formattedValue = Number(value).toLocaleString('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        maximumFractionDigits: 0
                      });
                      return [formattedValue, name];
                    }}
                    labelFormatter={(label) => `Month: ${label}`}
                    contentStyle={{
                      backgroundColor: 'white',
                      borderRadius: '0.5rem',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="rect"
                  />
                  <Bar dataKey="rc" stackId="a" fill={DOC_TYPE_COLORS.rc} name="RC" />
                  <Bar dataKey="insurance" stackId="a" fill={DOC_TYPE_COLORS.insurance} name="Insurance" />
                  <Bar dataKey="fitness" stackId="a" fill={DOC_TYPE_COLORS.fitness} name="Fitness" />
                  <Bar dataKey="permit" stackId="a" fill={DOC_TYPE_COLORS.permit} name="Permit" />
                  <Bar dataKey="puc" stackId="a" fill={DOC_TYPE_COLORS.puc} name="PUC" />
                  <Bar dataKey="tax" stackId="a" fill={DOC_TYPE_COLORS.tax} name="Tax" />
                  <Bar dataKey="other" stackId="a" fill={DOC_TYPE_COLORS.other} name="Other" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Summary Stats for the Chart */}
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500">Total (12 months)</p>
                <p className="text-sm font-semibold text-gray-900">
                  ₹{totalExpenditure.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Average/Month</p>
                <p className="text-sm font-semibold text-gray-900">
                  ₹{averageMonthly.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Peak Month</p>
                <p className="text-sm font-semibold text-gray-900">
                  {peakMonth.month}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Expenditure by Vehicle Chart */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-900 text-lg">Documentation Cost by Vehicle</h3>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={vehicleExpenditure}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                type="category"
                dataKey="vehicle"
                axisLine={false}
                tickLine={false}
                width={60}
                tick={{ fontSize: 10 }}
              />
              <Tooltip formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, 'Total Expense']} />
              <Bar dataKey="amount" name="Amount">
                {vehicleExpenditure.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(${index * 40}, 70%, 50%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Legend for document status */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 border-l-2 border-blue-500 pl-2">
        <h3 className="font-medium text-gray-700 mb-3">Document Status Legend</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center">
            <div className="w-4 h-4 rounded bg-success-100 border border-success-200 mr-2"></div>
            <span className="text-sm text-gray-600">Valid</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded bg-warning-100 border border-warning-200 mr-2"></div>
            <span className="text-sm text-gray-600">Expiring Soon (within 30 days)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded bg-error-100 border border-error-200 mr-2"></div>
            <span className="text-sm text-gray-600">Expired</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded bg-gray-100 border border-gray-200 mr-2"></div>
            <span className="text-sm text-gray-600">Missing/Not Available</span>
          </div>
        </div>
      </div>
    </>
  );
};
