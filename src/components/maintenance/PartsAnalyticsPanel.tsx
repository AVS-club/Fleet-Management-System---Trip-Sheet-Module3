import React, { useState, useMemo } from 'react';
import { MaintenanceTask, Vehicle } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Package, BarChart2 } from 'lucide-react';
import Select from '../ui/Select';
import CollapsibleSection from '../ui/CollapsibleSection';
import Button from '../ui/Button';

interface PartsAnalyticsPanelProps {
  tasks: MaintenanceTask[];
  vehicles: Vehicle[];
  visible?: boolean;
}

const CHART_COLORS = [
  '#4CAF50', '#2196F3', '#FFC107', '#F44336', '#9C27B0',
  '#00BCD4', '#FF5722', '#795548', '#607D8B', '#3F51B5'
];

const PartsAnalyticsPanel: React.FC<PartsAnalyticsPanelProps> = ({
  tasks,
  vehicles,
  visible = false
}) => {
  const [partTypeFilter, setPartTypeFilter] = useState('tyres');
  const [brandFilter, setBrandFilter] = useState('all');
  const [showPanel, setShowPanel] = useState(visible);

  // Extract all available brands from tasks
  const availableBrands = useMemo(() => {
    const brands = new Set<string>();
    
    if (Array.isArray(tasks)) {
      tasks.forEach(task => {
        if (Array.isArray(task.service_groups)) {
          task.service_groups.forEach(group => {
            // For tyres
            if (partTypeFilter === 'tyres' && group.tyre_tracking && group.tyre_brand) {
              brands.add(group.tyre_brand);
            }
            // For batteries
            else if (partTypeFilter === 'batteries' && group.battery_tracking && group.battery_brand) {
              brands.add(group.battery_brand);
            }
          });
        }
      });
    }
    
    return Array.from(brands);
  }, [tasks, partTypeFilter]);
  
  // Process data for charts based on filters
  const chartData = useMemo(() => {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      // Return fallback data if no tasks
      return {
        costPerBrand: [
          { brand: 'Brand A', cost: 4500 },
          { brand: 'Brand B', cost: 6000 },
          { brand: 'Brand C', cost: 5200 }
        ],
        countPerBrand: [
          { brand: 'Brand A', count: 8 },
          { brand: 'Brand B', count: 12 },
          { brand: 'Brand C', count: 5 }
        ]
      };
    }
    
    // Group and aggregate data
    const brandCosts: Record<string, { totalCost: number; count: number }> = {};
    
    tasks.forEach(task => {
      if (!Array.isArray(task.service_groups)) return;
      
      task.service_groups.forEach(group => {
        let brand: string | undefined;
        let cost: number | undefined;
        
        // Filter by part type and extract brand and cost
        if (partTypeFilter === 'tyres' && group.tyre_tracking && group.tyre_brand) {
          brand = group.tyre_brand;
          cost = typeof group.cost === 'number' ? group.cost : undefined;
        } 
        else if (partTypeFilter === 'batteries' && group.battery_tracking && group.battery_brand) {
          brand = group.battery_brand;
          cost = typeof group.cost === 'number' ? group.cost : undefined;
        }
        
        // Skip if no brand or not matching selected brand filter
        if (!brand || (brandFilter !== 'all' && brand !== brandFilter)) return;
        
        // Initialize brand entry if needed
        if (!brandCosts[brand]) {
          brandCosts[brand] = { totalCost: 0, count: 0 };
        }
        
        // Add cost data
        if (cost !== undefined) {
          brandCosts[brand].totalCost += cost;
          brandCosts[brand].count += 1;
        }
      });
    });
    
    // Convert to chart data format
    const costPerBrand = Object.entries(brandCosts).map(([brand, data]) => ({
      brand,
      cost: data.count > 0 ? data.totalCost / data.count : 0
    })).sort((a, b) => b.cost - a.cost);
    
    const countPerBrand = Object.entries(brandCosts).map(([brand, data]) => ({
      brand,
      count: data.count
    })).sort((a, b) => b.count - a.count);
    
    // If no actual data, use fallback
    if (costPerBrand.length === 0) {
      return {
        costPerBrand: [
          { brand: 'Brand A', cost: 4500 },
          { brand: 'Brand B', cost: 6000 },
          { brand: 'Brand C', cost: 5200 }
        ],
        countPerBrand: [
          { brand: 'Brand A', count: 8 },
          { brand: 'Brand B', count: 12 },
          { brand: 'Brand C', count: 5 }
        ]
      };
    }
    
    return { costPerBrand, countPerBrand };
  }, [tasks, partTypeFilter, brandFilter]);
  
  if (!showPanel) {
    return (
      <Button
        variant="outline"
        onClick={() => setShowPanel(true)}
        className="mb-4 mt-4"
        icon={<BarChart2 className="h-4 w-4" />}
      >
        Parts Analytics
      </Button>
    );
  }
  
  const hasData = chartData.costPerBrand.length > 0 && chartData.countPerBrand.length > 0;

  return (
    <CollapsibleSection
      title="Parts Analytics"
      icon={<Package className="h-5 w-5" />}
      iconColor="text-indigo-600"
      defaultExpanded={false}
    >
      <div className="space-y-4">
        {/* Filter Controls */}
        <div className="flex flex-wrap gap-4">
          <div className="w-full sm:w-auto">
            <Select
              label="Part Type"
              options={[
                { value: 'tyres', label: 'Tyres' },
                { value: 'batteries', label: 'Batteries' }
              ]}
              value={partTypeFilter}
              onChange={(e) => setPartTypeFilter(e.target.value)}
            />
          </div>
          
          <div className="w-full sm:w-auto">
            <Select
              label="Brand"
              options={[
                { value: 'all', label: 'All Brands' },
                ...availableBrands.map(brand => ({ value: brand, label: brand }))
              ]}
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
            />
          </div>
        </div>
        
        {/* Charts */}
        {hasData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Average Cost per Brand Chart */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Average Cost per Brand (₹)</h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData.costPerBrand}
                    margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="brand"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                    />
                    <YAxis 
                      tickFormatter={(value) => `₹${value/1000}k`}
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, 'Avg. Cost']}
                      contentStyle={{ 
                        fontSize: '12px', 
                        padding: '8px', 
                        borderRadius: '4px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Bar 
                      dataKey="cost" 
                      fill="#4F46E5"
                      radius={[4, 4, 0, 0]}
                    >
                      {chartData.costPerBrand.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Usage Count per Brand Chart */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Usage Count per Brand</h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData.countPerBrand}
                    margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="brand"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                    />
                    <YAxis 
                      allowDecimals={false}
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(value: any) => [`${value}`, 'Count']}
                      contentStyle={{ 
                        fontSize: '12px', 
                        padding: '8px', 
                        borderRadius: '4px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="#10B981"
                      radius={[4, 4, 0, 0]}
                    >
                      {chartData.countPerBrand.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-gray-500">No data available for this part type or brand selection.</p>
          </div>
        )}
        
        {/* Close Button */}
        <div className="flex justify-end mt-4">
          <Button
            variant="outline"
            onClick={() => setShowPanel(false)}
          >
            Close Panel
          </Button>
        </div>
      </div>
    </CollapsibleSection>
  );
};

export default PartsAnalyticsPanel;