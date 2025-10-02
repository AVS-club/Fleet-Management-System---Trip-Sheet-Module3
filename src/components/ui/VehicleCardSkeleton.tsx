import React from 'react';

const VehicleCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse h-64">
      {/* Header with vehicle ID and actions */}
      <div className="flex justify-between items-start mb-4">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
        <div className="flex space-x-2">
          <div className="h-6 w-6 bg-gray-200 rounded"></div>
          <div className="h-6 w-6 bg-gray-200 rounded"></div>
          <div className="h-6 w-6 bg-gray-200 rounded"></div>
        </div>
      </div>

      {/* Vehicle registration and driver */}
      <div className="mb-4">
        <div className="h-5 bg-gray-200 rounded w-32 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-28"></div>
      </div>

      {/* Stats grid - Fixed height to prevent layout shifts */}
      <div className="grid grid-cols-2 gap-4 mb-4 h-20">
        <div className="flex flex-col justify-between">
          <div className="h-3 bg-gray-200 rounded w-16"></div>
          <div className="h-4 bg-gray-200 rounded w-12"></div>
        </div>
        <div className="flex flex-col justify-between">
          <div className="h-3 bg-gray-200 rounded w-20"></div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>
        <div className="flex flex-col justify-between">
          <div className="h-3 bg-gray-200 rounded w-14"></div>
          <div className="h-4 bg-gray-200 rounded w-10"></div>
        </div>
        <div className="flex flex-col justify-between">
          <div className="h-3 bg-gray-200 rounded w-18"></div>
          <div className="h-4 bg-gray-200 rounded w-14"></div>
        </div>
      </div>

      {/* Status badge - Fixed height */}
      <div className="flex justify-between items-center h-6">
        <div className="h-6 bg-gray-200 rounded-full w-16"></div>
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </div>
    </div>
  );
};

export default VehicleCardSkeleton;
