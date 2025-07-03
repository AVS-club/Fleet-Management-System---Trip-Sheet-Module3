import React, { useState, useEffect } from 'react';
import { X, IndianRupee, TrendingUp, Truck, Weight, Calculator, Info } from 'lucide-react';
import { Trip, Vehicle, Driver } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { updateTrip } from '../../utils/storage';
import { toast } from 'react-toastify';

interface TripPnlModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  vehicle?: Vehicle | null;
  driver?: Driver | null;
  onUpdate?: (updatedTrip: Trip) => void;
}

const TripPnlModal: React.FC<TripPnlModalProps> = ({
  isOpen,
  onClose,
  trip,
  vehicle,
  driver,
  onUpdate
}) => {
  const [billingType, setBillingType] = useState<'per_km' | 'per_ton' | 'manual'>(
    trip.billing_type || 'per_km'
  );
  const [freightRate, setFreightRate] = useState<number>(trip.freight_rate || 0);
  const [manualIncome, setManualIncome] = useState<number>(trip.income_amount || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEstimated, setIsEstimated] = useState(true);

  // Calculate trip distance
  const distance = trip.end_km - trip.start_km;

  // Calculate total expenses
  const fuelCost = trip.total_fuel_cost || 0;
  const driverExpense = trip.driver_expense || 0;
  const tollCost = trip.estimated_toll_cost || 0;
  const unloadingExpense = trip.unloading_expense || 0;
  const roadRtoExpense = trip.road_rto_expense || 0;
  const miscExpense = trip.miscellaneous_expense || 0;
  const totalExpenses = fuelCost + driverExpense + tollCost + unloadingExpense + roadRtoExpense + miscExpense;

  // Calculate income based on billing type
  const calculateIncome = (): number => {
    switch (billingType) {
      case 'per_km':
        return distance * freightRate;
      case 'per_ton':
        return trip.gross_weight * freightRate;
      case 'manual':
        return manualIncome;
      default:
        return 0;
    }
  };

  const income = calculateIncome();
  const netProfit = income - totalExpenses;
  const costPerKm = distance > 0 ? totalExpenses / distance : 0;
  
  // Determine profit status
  const getProfitStatus = (): 'profit' | 'loss' | 'neutral' => {
    if (netProfit > 0) return 'profit';
    if (netProfit < 0) return 'loss';
    return 'neutral';
  };

  // Update isEstimated flag
  useEffect(() => {
    setIsEstimated(billingType !== 'manual');
  }, [billingType]);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const profitStatus = getProfitStatus();
      
      const updatedTrip = await updateTrip(trip.id, {
        freight_rate: freightRate,
        billing_type: billingType,
        income_amount: income,
        total_expense: totalExpenses,
        net_profit: netProfit,
        cost_per_km: costPerKm,
        profit_status: profitStatus
      });

      if (updatedTrip) {
        toast.success('P&L data saved successfully');
        if (onUpdate) {
          onUpdate(updatedTrip);
        }
        onClose();
      } else {
        toast.error('Failed to save P&L data');
      }
    } catch (error) {
      console.error('Error saving P&L data:', error);
      toast.error('Error saving P&L data');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <IndianRupee className="h-5 w-5 mr-2 text-primary-600" />
            Trip P&L Analysis
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Trip Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Trip Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Trip ID</p>
                <p className="font-medium">{trip.trip_serial_number}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Vehicle</p>
                <p className="font-medium">{vehicle?.registration_number || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Driver</p>
                <p className="font-medium">{driver?.name || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Distance</p>
                <p className="font-medium">{distance.toLocaleString()} km</p>
              </div>
            </div>
          </div>

          {/* Income Section */}
          <div className="space-y-4">
            <h3 className="text-base font-medium text-gray-900 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
              Income
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Billing Type"
                options={[
                  { value: 'per_km', label: 'Per Kilometer' },
                  { value: 'per_ton', label: 'Per Ton' },
                  { value: 'manual', label: 'Manual Entry' }
                ]}
                value={billingType}
                onChange={(e) => setBillingType(e.target.value as 'per_km' | 'per_ton' | 'manual')}
              />
              
              {billingType === 'per_km' && (
                <Input
                  label="Rate per KM (₹)"
                  type="number"
                  value={freightRate}
                  onChange={(e) => setFreightRate(parseFloat(e.target.value) || 0)}
                  icon={<IndianRupee className="h-4 w-4" />}
                />
              )}
              
              {billingType === 'per_ton' && (
                <Input
                  label="Rate per Ton (₹)"
                  type="number"
                  value={freightRate}
                  onChange={(e) => setFreightRate(parseFloat(e.target.value) || 0)}
                  icon={<IndianRupee className="h-4 w-4" />}
                />
              )}
              
              {billingType === 'manual' && (
                <Input
                  label="Total Income (₹)"
                  type="number"
                  value={manualIncome}
                  onChange={(e) => setManualIncome(parseFloat(e.target.value) || 0)}
                  icon={<IndianRupee className="h-4 w-4" />}
                />
              )}
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg flex justify-between items-center">
              <div className="flex items-center">
                <span className="text-sm font-medium text-green-800">Total Income:</span>
                {isEstimated && (
                  <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full flex items-center">
                    <Info className="h-3 w-3 mr-1" />
                    Estimated
                  </span>
                )}
              </div>
              <span className="text-lg font-bold text-green-700">₹{income.toLocaleString()}</span>
            </div>
          </div>

          {/* Expenses Section */}
          <div className="space-y-4">
            <h3 className="text-base font-medium text-gray-900 flex items-center">
              <IndianRupee className="h-5 w-5 mr-2 text-red-600" />
              Expenses
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Fuel Cost</p>
                <p className="font-medium">₹{fuelCost.toLocaleString()}</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Driver Bata</p>
                <p className="font-medium">₹{driverExpense.toLocaleString()}</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Toll Charges</p>
                <p className="font-medium">₹{tollCost.toLocaleString()}</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Loading/Unloading</p>
                <p className="font-medium">₹{unloadingExpense.toLocaleString()}</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Road/RTO Expense</p>
                <p className="font-medium">₹{roadRtoExpense.toLocaleString()}</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Miscellaneous</p>
                <p className="font-medium">₹{miscExpense.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg flex justify-between items-center">
              <span className="text-sm font-medium text-red-800">Total Expenses:</span>
              <span className="text-lg font-bold text-red-700">₹{totalExpenses.toLocaleString()}</span>
            </div>
          </div>

          {/* Summary Section */}
          <div className="space-y-4">
            <h3 className="text-base font-medium text-gray-900 flex items-center">
              <Calculator className="h-5 w-5 mr-2 text-primary-600" />
              Summary
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Total Income</p>
                <p className="font-medium text-green-600">₹{income.toLocaleString()}</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Total Expenses</p>
                <p className="font-medium text-red-600">₹{totalExpenses.toLocaleString()}</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Net Profit/Loss</p>
                <p className={`font-medium ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{netProfit.toLocaleString()}
                </p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Cost per KM</p>
                <p className="font-medium">₹{costPerKm.toFixed(2)}/km</p>
              </div>
            </div>
            
            <div className={`p-4 rounded-lg flex justify-between items-center ${
              netProfit > 0 
                ? 'bg-green-50 text-green-800' 
                : netProfit < 0 
                  ? 'bg-red-50 text-red-800' 
                  : 'bg-gray-50 text-gray-800'
            }`}>
              <span className="text-sm font-medium">Net Profit/Loss:</span>
              <span className="text-lg font-bold">₹{netProfit.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            isLoading={isSubmitting}
          >
            Save P&L Data
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TripPnlModal;