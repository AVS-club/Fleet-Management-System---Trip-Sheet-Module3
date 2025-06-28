import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import CollapsibleSection from '../ui/CollapsibleSection';

interface TaskDistributionChartProps {
  taskTypeDistribution: { type: string; count: number }[];
}

// Chart colors
const CHART_COLORS = [
  '#4CAF50', '#2196F3', '#FFC107', '#F44336', '#9C27B0',
  '#00BCD4', '#FF5722', '#795548', '#607D8B', '#3F51B5'
];

// Helper function to format task type for display
const formatTaskType = (type: string): string => {
  return type
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const TaskDistributionChart: React.FC<TaskDistributionChartProps> = ({
  taskTypeDistribution
}) => {
  // Format data for the chart
  const chartData = taskTypeDistribution.map(item => ({
    name: formatTaskType(item.type),
    value: item.count
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-md shadow-sm">
          <p className="font-medium text-sm">{payload[0].name}</p>
          <p className="text-sm">{payload[0].value} tasks ({Math.round(payload[0].payload.percent * 100)}%)</p>
        </div>
      );
    }
    return null;
  };

  // Calculate percentages for each item
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const dataWithPercent = chartData.map(item => ({
    ...item,
    percent: total > 0 ? item.value / total : 0
  }));

  // If no data, show placeholder
  if (chartData.length === 0) {
    return (
      <CollapsibleSection 
        title="Task Type Distribution" 
        iconColor="text-purple-600"
      >
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500">No task type data available for the selected period</p>
          </div>
        </div>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection 
      title="Task Type Distribution" 
      iconColor="text-purple-600"
    >
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataWithPercent}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                labelLine={false}
                label={({ name, percent }) => {
                  const percentValue = (percent * 100).toFixed(0);
                  return percentValue > 5 ? `${percentValue}%` : '';
                }}
              >
                {dataWithPercent.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </CollapsibleSection>
  );
};

export default TaskDistributionChart;