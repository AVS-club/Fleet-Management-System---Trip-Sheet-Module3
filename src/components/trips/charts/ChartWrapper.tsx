import React from 'react';
import { ResponsiveContainer } from 'recharts';

interface ChartWrapperProps {
  dataLength: number;
  scrollDirection?: 'x' | 'y';
  minSizeClass?: string;
  emptyMessage?: string;
  children: React.ReactNode;
}

const ChartWrapper: React.FC<ChartWrapperProps> = ({
  dataLength,
  scrollDirection = 'x',
  minSizeClass,
  emptyMessage = 'No fuel consumption data available for the selected period',
  children,
}) => {
  const overflowClass = scrollDirection === 'x' ? 'overflow-x-auto' : 'overflow-y-auto';
  const sizeClass = minSizeClass ?? (scrollDirection === 'x' ? 'min-w-[600px]' : 'min-h-[350px]');

  return (
    <div className="space-y-2">
      <div className={`h-72 ${overflowClass}`}>
        <div className={`${sizeClass} h-full`}>
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      </div>

      {dataLength === 0 && (
        <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
          {emptyMessage}
        </div>
      )}
    </div>
  );
};

export default ChartWrapper;

