import React from 'react';
import { Tool, AlertTriangle, Clock, CheckCircle, IndianRupee, BarChart2 } from 'lucide-react';

interface KPIPanelProps {
  totalTasks: number;
  pendingTasks: number;
  averageCompletionTime: number;
  completedTasksThisMonth: number;
  averageCost: number;
  totalExpenditure: number;
  previousPeriodComparison?: {
    totalTasks: number;
    totalExpenditure: number;
    percentChange: number;
  };
}

const KPIPanel: React.FC<KPIPanelProps> = ({
  totalTasks,
  pendingTasks,
  averageCompletionTime,
  completedTasksThisMonth,
  averageCost,
  totalExpenditure,
  previousPeriodComparison
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <div className="bg-white rounded-lg shadow-sm p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Total Tasks</p>
            <h3 className="text-xl font-bold text-gray-900">{totalTasks}</h3>
            {previousPeriodComparison && (
              <p className="text-xs text-gray-500 mt-1">
                {previousPeriodComparison.totalTasks < totalTasks ? (
                  <span className="text-success-600">↑ {Math.abs(totalTasks - previousPeriodComparison.totalTasks)}</span>
                ) : previousPeriodComparison.totalTasks > totalTasks ? (
                  <span className="text-error-600">↓ {Math.abs(totalTasks - previousPeriodComparison.totalTasks)}</span>
                ) : (
                  <span>No change</span>
                )} vs previous period
              </p>
            )}
          </div>
          <Tool className="h-6 w-6 text-primary-500" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Pending Tasks</p>
            <h3 className="text-xl font-bold text-warning-600">{pendingTasks}</h3>
            <p className="text-xs text-gray-500 mt-1">Requires attention</p>
          </div>
          <AlertTriangle className="h-6 w-6 text-warning-500" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Avg. Completion</p>
            <h3 className="text-xl font-bold text-gray-900">{averageCompletionTime.toFixed(1)} days</h3>
            <p className="text-xs text-gray-500 mt-1">Based on completed tasks</p>
          </div>
          <Clock className="h-6 w-6 text-primary-500" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Completed This Month</p>
            <h3 className="text-xl font-bold text-success-600">{completedTasksThisMonth}</h3>
            <p className="text-xs text-gray-500 mt-1">Tasks resolved</p>
          </div>
          <CheckCircle className="h-6 w-6 text-success-500" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Avg. Maintenance Cost</p>
            <h3 className="text-xl font-bold text-gray-900">₹{averageCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
            <p className="text-xs text-gray-500 mt-1">Per maintenance task</p>
          </div>
          <IndianRupee className="h-6 w-6 text-primary-500" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Total Expenditure</p>
            <h3 className="text-xl font-bold text-gray-900">₹{totalExpenditure.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
            {previousPeriodComparison && (
              <p className="text-xs mt-1">
                <span className={previousPeriodComparison.percentChange > 0 ? 'text-error-600' : 'text-success-600'}>
                  {previousPeriodComparison.percentChange > 0 ? '↑' : '↓'} {Math.abs(Math.round(previousPeriodComparison.percentChange))}%
                </span> vs previous
              </p>
            )}
          </div>
          <BarChart2 className="h-6 w-6 text-primary-500" />
        </div>
      </div>
    </div>
  );
};

export default KPIPanel;