import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { ChevronRight } from 'lucide-react';
import CollapsibleSection from '../ui/CollapsibleSection';

interface ExpenditureAnalyticsProps {
  monthlyExpenditure: { month: string; cost: number }[];
  expenditureByVehicle: { vehicleId: string; registration: string; cost: number }[];
  expenditureByVendor: { vendorId: string; name: string; cost: number }[];
  taskTypeDistribution?: { type: string; count: number }[];
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
  taskTypeDistribution,
  previousPeriodComparison
}) => {
  const [showFullVehicleList, setShowFullVehicleList] = useState(false);
  const [showFullVendorList, setShowFullVendorList] = useState(false);

  // Limit data for initial view
  const topVehicles = showFullVehicleList 
    ? (expenditureByVehicle || [])
    : (expenditureByVehicle || []).slice(0, 5);

  const topVendors = showFullVendorList 
    ? (expenditureByVendor || [])
    : (expenditureByVendor || []).slice(0, 5);

  // Custom tooltip for monthly expenditure
  const CustomMonthlyTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Monthly Expenditure Chart - Apple-like Design */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Expenditure Over Time</h3>
              {previousPeriodComparison && (
                <div className={`text-xs font-medium px-3 py-1.5 rounded-full 
                  ${previousPeriodComparison.percentChange < 0 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                  {previousPeriodComparison.percentChange < 0 ? '↓' : '↑'} 
                  {Math.abs(Math.round(previousPeriodComparison.percentChange))}% vs previous
                </div>
              )}
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={monthlyExpenditure}
                  margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    content={<CustomMonthlyTooltip />}
                    cursor={{ stroke: '#4CAF50', strokeWidth: 1, strokeDasharray: '5 5' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cost"
                    stroke="#4CAF50"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: '#4CAF50', stroke: '#fff', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expenditure By Vehicle Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Expenditure by Vehicle</h3>
              <button 
                className="text-xs text-primary-600 flex items-center"
                onClick={() => setShowFullVehicleList(!showFullVehicleList)}
              >
                {showFullVehicleList ? 'Show Top 5' : 'View All'} 
                <ChevronRight className="h-3 w-3 ml-1" />
              </button>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topVehicles}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0"/>
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="registration"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    width={70}
                  />
                  <Tooltip
                    formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Cost']}
                    labelFormatter={(label) => `Vehicle: ${label}`}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Bar dataKey="cost" radius={[0, 8, 8, 0]} barSize={24}>
                    {(topVehicles || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expenditure by Vendor Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Expenditure by Vendor</h3>
              <button 
                className="text-xs text-primary-600 flex items-center"
                onClick={() => setShowFullVendorList(!showFullVendorList)}
              >
                {showFullVendorList ? 'Show Top 5' : 'View All'} 
                <ChevronRight className="h-3 w-3 ml-1" />
              </button>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topVendors}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0"/>
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    width={120}
                    tickFormatter={(value) => {
                      // Truncate long vendor names
                      if (value.length > 20) {
                        return value.substring(0, 17) + '...';
                      }
                      return value;
                    }}
                  />
                  <Tooltip
                    formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Cost']}
                    labelFormatter={(label) => `Vendor: ${label}`}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Bar dataKey="cost" radius={[0, 8, 8, 0]} barSize={24}>
                    {(topVendors || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Task Type Distribution Chart - Apple-like Design */}
          {taskTypeDistribution && taskTypeDistribution.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Task Type Distribution</h3>
              </div>
              <div className="h-80 flex items-center justify-center">
                <div className="w-full max-w-md">
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={taskTypeDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        innerRadius={40}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="type"
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        stroke="#fff"
                        strokeWidth={2}
                      >
                        {(taskTypeDistribution || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          `${value} tasks`,
                          name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                        ]}
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Legend */}
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    {taskTypeDistribution.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <span className="text-sm text-gray-700 truncate">
                          {entry.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
};

export default ExpenditureAnalytics;