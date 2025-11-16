import React from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Wrench, Package } from 'lucide-react';
import CollapsibleSection from '../ui/CollapsibleSection';

interface ServicesPartsBreakdownProps {
  serviceTypeBreakdown?: { type: string; count: number }[];
  partsBreakdown?: { type: string; count: number }[];
}

const CHART_COLORS = [
  '#4CAF50', '#2196F3', '#FFC107', '#F44336', '#9C27B0', 
  '#00BCD4', '#FF5722', '#795548', '#607D8B', '#3F51B5'
];

const ServicesPartsBreakdown: React.FC<ServicesPartsBreakdownProps> = ({
  serviceTypeBreakdown = [],
  partsBreakdown = []
}) => {
  const hasData = (serviceTypeBreakdown && serviceTypeBreakdown.length > 0) || 
                  (partsBreakdown && partsBreakdown.length > 0);

  if (!hasData) {
    return null;
  }

  return (
    <CollapsibleSection
      title="Services & Parts Breakdown"
      defaultExpanded={true}
      iconColor="text-purple-600"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Service Type Breakdown */}
        {serviceTypeBreakdown && serviceTypeBreakdown.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Wrench className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Service Type</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={serviceTypeBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    innerRadius={30}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="type"
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {serviceTypeBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value} services`, 'Count']}
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
              <div className="mt-4 flex flex-wrap gap-3 justify-center">
                {serviceTypeBreakdown.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <span className="text-sm text-gray-700">
                      {entry.type}: {entry.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Parts Breakdown */}
        {partsBreakdown && partsBreakdown.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Package className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Parts Used</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={partsBreakdown}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0"/>
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="type"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    width={100}
                    tickFormatter={(value) => {
                      // Truncate long part names
                      if (value.length > 18) {
                        return value.substring(0, 15) + '...';
                      }
                      return value;
                    }}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value} units`, 'Quantity']}
                    labelFormatter={(label) => `Part: ${label}`}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={24} fill="#2196F3">
                    {partsBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
};

export default ServicesPartsBreakdown;

