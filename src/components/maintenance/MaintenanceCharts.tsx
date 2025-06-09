import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { MaintenanceTask, Vehicle } from '../../types';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';

interface MaintenanceChartsProps {
  tasks: MaintenanceTask[];
  vehicles: Vehicle[] | null;
}

const CHART_COLORS = ['#4CAF50', '#2196F3', '#FFC107', '#F44336', '#9C27B0'];

const MaintenanceCharts: React.FC<MaintenanceChartsProps> = ({ tasks, vehicles }) => {
  // Calculate monthly expenditure data
  const monthlyData = React.useMemo(() => {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    
    const months = eachMonthOfInterval({
      start: sixMonthsAgo,
      end: now
    });

    return Array.isArray(tasks) ? months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthTasks = tasks.filter(task => {
        const taskDate = new Date(task.start_date);
        return taskDate >= monthStart && taskDate <= monthEnd;
      });

      const totalCost = monthTasks.reduce((sum, task) => 
        sum + (task.actual_cost || task.estimated_cost || 0), 
        0
      );

      return {
        month: format(month, 'MMM yy'),
        cost: totalCost
      };
    }) : [];
  }, [tasks]);

  // Calculate expenditure by vehicle
  const vehicleData = React.useMemo(() => {
    const data = Array.isArray(vehicles) && Array.isArray(tasks) ? vehicles.map(vehicle => {
      const vehicleTasks = tasks.filter(task => task.vehicle_id === vehicle.id);
      const totalCost = Array.isArray(vehicleTasks) ? vehicleTasks.reduce((sum, task) => 
        sum + (task.actual_cost || task.estimated_cost || 0), 
        0
      ) : 0;

      return {
        name: vehicle.registration_number || 'Unknown',
        value: totalCost
      };
    }) : [];

    return Array.isArray(data) ? data.sort((a, b) => b.value - a.value) : [];
  }, [tasks, vehicles]);

  // Calculate task type distribution
  const taskTypeData = React.useMemo(() => {
    if (!Array.isArray(tasks)) return [];
    
    const typeCount: Record<string, number> = {};
    tasks.forEach(task => {
      typeCount[task.task_type] = (typeCount[task.task_type] || 0) + 1;
    });

    return Object.entries(typeCount).map(([type, count]) => ({
      name: type.replace('_', ' '),
      value: count
    }));
  }, [tasks]);

  if (!Array.isArray(tasks) || tasks.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Expenditure</h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            No maintenance data available
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Expenditure</h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            No maintenance data available
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Expenditure</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Cost']}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem'
                }}
              />
              <Bar dataKey="cost" fill="#4CAF50" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Expenditure</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={vehicleData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, value }) => `${name}: ₹${value.toLocaleString()}`}
              >
                {Array.isArray(vehicleData) && vehicleData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Cost']}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Task Type Distribution</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={taskTypeData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {Array.isArray(taskTypeData) && taskTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceCharts;