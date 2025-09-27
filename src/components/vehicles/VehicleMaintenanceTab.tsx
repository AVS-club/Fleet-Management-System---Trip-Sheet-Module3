import React, { useState, useEffect } from 'react';
import { Tool, AlertTriangle, TrendingUp, Award, Clock } from 'lucide-react';

interface VehicleMaintenanceTabProps {
  vehicleId: string;
  vehicleType: string; // truck, tempo, etc.
}

interface MaintenanceStats {
  totalMaintenances: number;
  totalCost: number;
  ranking: number;
  totalVehiclesInCategory: number;
  mostWornParts: Array<{
    name: string;
    wearPercentage: number;
    lastReplaced: string;
    daysToReplace: number;
  }>;
  healthScore: number;
  nextMaintenance: string | null;
  comparisonData: {
    maintenanceFrequency: number;
    costPerKm: number;
    breakdownRate: number;
  } | null;
}

const VehicleMaintenanceTab: React.FC<VehicleMaintenanceTabProps> = ({
  vehicleId,
  vehicleType
}) => {
  const [stats, setStats] = useState<MaintenanceStats>({
    totalMaintenances: 0,
    totalCost: 0,
    ranking: 0,
    totalVehiclesInCategory: 0,
    mostWornParts: [],
    healthScore: 0,
    nextMaintenance: null,
    comparisonData: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMaintenanceStats();
  }, [vehicleId, vehicleType]);

  const loadMaintenanceStats = async () => {
    try {
      // Simulate loading maintenance data
      // In a real app, this would fetch from your API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStats({
        totalMaintenances: 12,
        totalCost: 45000,
        ranking: 3,
        totalVehiclesInCategory: 15,
        mostWornParts: [
          { name: 'Engine Oil', wearPercentage: 75, lastReplaced: '30 days ago', daysToReplace: 15 },
          { name: 'Air Filter', wearPercentage: 60, lastReplaced: '60 days ago', daysToReplace: 30 },
          { name: 'Brake Pads', wearPercentage: 40, lastReplaced: '90 days ago', daysToReplace: 90 }
        ],
        healthScore: 85,
        nextMaintenance: 'Oil Change - Due in 15 days',
        comparisonData: {
          maintenanceFrequency: -15, // 15% better than average
          costPerKm: 0.5, // ₹0.5 higher than average
          breakdownRate: -20 // 20% lower than average
        }
      });
    } catch (error) {
      console.error('Error loading maintenance stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading maintenance data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Health Score Card */}
      <div className="bg-white rounded-lg p-6 border-l-4 border-primary-500">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Vehicle Health</h3>
            <p className="text-sm text-gray-600 mt-1">
              Ranking: #{stats.ranking} out of {stats.totalVehiclesInCategory} {vehicleType}s
            </p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary-600">
              {stats.healthScore}%
            </div>
            <p className="text-xs text-gray-500">Health Score</p>
          </div>
        </div>
      </div>

      {/* Most Worn Parts */}
      <div className="bg-white rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Parts Needing Attention
        </h3>
        
        <div className="space-y-3">
          {stats.mostWornParts.map((part, index) => (
            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{part.name}</p>
                <p className="text-xs text-gray-500">
                  Last replaced: {part.lastReplaced}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-orange-600">
                  {part.wearPercentage}% worn
                </p>
                <p className="text-xs text-gray-500">
                  Replace in ~{part.daysToReplace} days
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison with Similar Vehicles */}
      {stats.comparisonData && (
        <div className="bg-white rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Performance vs Other {vehicleType}s
          </h3>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Maintenance Frequency</span>
              <span className={`text-sm font-medium ${
                stats.comparisonData.maintenanceFrequency < 0 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {Math.abs(stats.comparisonData.maintenanceFrequency)}% 
                {stats.comparisonData.maintenanceFrequency < 0 ? ' better' : ' worse'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Cost per KM</span>
              <span className={`text-sm font-medium ${
                stats.comparisonData.costPerKm < 0 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                ₹{Math.abs(stats.comparisonData.costPerKm)} 
                {stats.comparisonData.costPerKm < 0 ? ' lower' : ' higher'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Breakdown Rate</span>
              <span className={`text-sm font-medium ${
                stats.comparisonData.breakdownRate < 0 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {Math.abs(stats.comparisonData.breakdownRate)}% 
                {stats.comparisonData.breakdownRate < 0 ? ' lower' : ' higher'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Maintenance History */}
      <div className="bg-white rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Maintenance</h3>
        <div className="space-y-2">
          {/* Simple maintenance list */}
          <div className="text-sm text-gray-600">
            <div className="flex justify-between py-2 border-b">
              <span>Oil Change</span>
              <span>15 days ago</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span>Tyre Rotation</span>
              <span>45 days ago</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span>Brake Inspection</span>
              <span>60 days ago</span>
            </div>
            <div className="flex justify-between py-2">
              <span>Air Filter Replacement</span>
              <span>90 days ago</span>
            </div>
          </div>
        </div>
      </div>

      {/* Next Maintenance Alert */}
      {stats.nextMaintenance && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            <div>
              <h4 className="font-medium text-yellow-800">Upcoming Maintenance</h4>
              <p className="text-sm text-yellow-700">{stats.nextMaintenance}</p>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Summary */}
      <div className="bg-white rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Maintenance Summary</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{stats.totalMaintenances}</p>
            <p className="text-xs text-gray-500">Total Services</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">₹{stats.totalCost.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Total Cost</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleMaintenanceTab;
