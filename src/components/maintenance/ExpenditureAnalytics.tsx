import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, BarChart, Bar } from 'recharts';
import { ChevronRight } from 'lucide-react';
import CollapsibleSection from '../ui/CollapsibleSection';
import Button from '../ui/Button';
import TopMaintenanceCategoriesChart from './TopMaintenanceCategoriesChart';

interface ExpenditureAnalyticsProps {
  monthlyExpenditure: { month: string; cost: number }[];
  expenditureByVehicle: { vehicleId: string; registration: string; cost: number }[];
  expenditureByVendor: { vendorId: string; name: string; cost: number }[];
  topMaintenanceCategories: { category: string; cost: number }[];
  previousPeriodComparison?: {
    totalExpenditure: number;
    percentChange: number;
  };
}

const CHART_COLORS = [
  '#4CAF50', '#2196F3', '#FFC107', '#F44336', '#9C27B0', 
  '#00BCD4', '#FF5722', '#795548', '#607D8B', '#3F51B5'
];

const ExpenditureAnalytics: React.FC<ExpenditureAnalyticsProps> = ({
  monthlyExpenditure,
  expenditureByVehicle,
  expenditureByVendor,
  topMaintenanceCategories,
  previousPeriodComparison
}) => {
  // Custom tooltip for monthly expenditure
  const CustomMonthlyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-md shadow-sm">
          <p className="font-medium text-sm">{label}</p>
          <p className="text-sm text-primary-600">
            ₹{payload[0].value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <CollapsibleSection 
        title="Expenditure Analytics" 
        defaultExpanded={true}
        iconColor="text-green-600"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Monthly Expenditure Chart */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-medium text-gray-900">Expenditure Over Time</h3>
              {previousPeriodComparison && (
                <div className={`text-xs font-medium px-2 py-1 rounded-full 
                  ${previousPeriodComparison.percentChange < 0 
                    ? 'bg-success-100 text-success-800' 
                    : 'bg-error-100 text-error-800'
                  }`}>
                  {previousPeriodComparison.percentChange < 0 ? '↓' : '↑'} 
                  {Math.abs(Math.round(previousPeriodComparison.percentChange))}% vs previous
                </div>
              )}
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={monthlyExpenditure}
                  margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${value.toLocaleString()}`}
                  />
                  <Tooltip content={<CustomMonthlyTooltip />} />
                  <Line
                    type="monotone" 
                    dataKey="cost" 
                    stroke="#4CAF50" 
                    strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 2, fill: "white" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expenditure By Vehicle Chart */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-medium text-gray-900">Expenditure by Vehicle</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={expenditureByVehicle.slice(0, 5)}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis 
                    type="number" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${value.toLocaleString()}`}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="registration" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                    width={80}
                  />
                  <Tooltip
                    formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Cost']}
                    labelStyle={{ fontWeight: 'bold' }}
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      borderRadius: '0.5rem',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                    }}
                  />
                  <Bar dataKey="cost" barSize={20}>
                    {expenditureByVehicle.slice(0, 5).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expenditure by Vendor Chart */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-medium text-gray-900">Expenditure by Vendor</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={expenditureByVendor.slice(0, 5)}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis 
                    type="number" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${value.toLocaleString()}`}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip
                    formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Cost']}
                    labelStyle={{ fontWeight: 'bold' }}
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      borderRadius: '0.5rem',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                    }}
                  />
                  <Bar dataKey="cost" barSize={20}>
                    {expenditureByVendor.slice(0, 5).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Maintenance Categories Chart */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <TopMaintenanceCategoriesChart data={topMaintenanceCategories} />
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
};

export default ExpenditureAnalytics;