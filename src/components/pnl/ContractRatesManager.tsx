import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Save, FileText, TrendingUp, Calendar, Truck } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { supabase } from '../../utils/supabaseClient';
import { createLogger } from '../../utils/logger';

const logger = createLogger('ContractRatesManager');

interface ContractRate {
  id?: string;
  customer_id: string;
  customer_name?: string;
  route?: string;
  vehicle_type?: string;
  rate_type: 'per_km' | 'per_ton' | 'per_trip';
  rate: number;
  valid_from: string;
  valid_to?: string;
  min_guarantee?: number;
  fuel_adjustment?: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

interface ContractRatesManagerProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Array<{ id: string; name: string }>;
  onRateCreated?: (rate: ContractRate) => void;
}

const ContractRatesManager: React.FC<ContractRatesManagerProps> = ({
  isOpen,
  onClose,
  customers,
  onRateCreated
}) => {
  const [contracts, setContracts] = useState<ContractRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ContractRate>>({
    rate_type: 'per_km',
    fuel_adjustment: false
  });
  const [showForm, setShowForm] = useState(false);

  // Fetch existing contracts
  const fetchContracts = async () => {
    try {
      setLoading(true);
      // For now, store in local storage as contract_rates table doesn't exist yet
      const stored = localStorage.getItem('contract_rates');
      if (stored) {
        setContracts(JSON.parse(stored));
      }
    } catch (error) {
      logger.error('Error fetching contracts:', error);
      toast.error('Failed to load contract rates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchContracts();
    }
  }, [isOpen]);

  const handleSave = async () => {
    try {
      if (!formData.customer_id || !formData.rate || !formData.valid_from) {
        toast.error('Please fill all required fields');
        return;
      }

      const customer = customers.find(c => c.id === formData.customer_id);
      const newContract: ContractRate = {
        ...formData as ContractRate,
        id: editingId || `contract_${Date.now()}`,
        customer_name: customer?.name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      let updatedContracts: ContractRate[];
      if (editingId) {
        updatedContracts = contracts.map(c => c.id === editingId ? newContract : c);
      } else {
        updatedContracts = [...contracts, newContract];
      }

      // Save to local storage for now
      localStorage.setItem('contract_rates', JSON.stringify(updatedContracts));
      setContracts(updatedContracts);

      if (onRateCreated) {
        onRateCreated(newContract);
      }

      toast.success(editingId ? 'Contract updated successfully' : 'Contract created successfully');
      
      // Reset form
      setFormData({ rate_type: 'per_km', fuel_adjustment: false });
      setEditingId(null);
      setShowForm(false);
    } catch (error) {
      logger.error('Error saving contract:', error);
      toast.error('Failed to save contract rate');
    }
  };

  const handleEdit = (contract: ContractRate) => {
    setFormData(contract);
    setEditingId(contract.id || null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contract?')) return;

    try {
      const updatedContracts = contracts.filter(c => c.id !== id);
      localStorage.setItem('contract_rates', JSON.stringify(updatedContracts));
      setContracts(updatedContracts);
      toast.success('Contract deleted successfully');
    } catch (error) {
      logger.error('Error deleting contract:', error);
      toast.error('Failed to delete contract');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Contract Rates Manager
              </h2>
            </div>
            <Button
              variant="outline"
              inputSize="sm"
              onClick={onClose}
              icon={<X className="h-4 w-4" />}
            />
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Add New Contract Button */}
          {!showForm && (
            <div className="mb-6">
              <Button
                onClick={() => setShowForm(true)}
                icon={<Plus className="h-4 w-4" />}
              >
                Add New Contract
              </Button>
            </div>
          )}

          {/* Contract Form */}
          {showForm && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                {editingId ? 'Edit Contract' : 'New Contract'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Customer *
                  </label>
                  <Select
                    value={formData.customer_id || ''}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                    options={[
                      { value: '', label: 'Select Customer' },
                      ...customers.map(c => ({ value: c.id, label: c.name }))
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Rate Type *
                  </label>
                  <Select
                    value={formData.rate_type || 'per_km'}
                    onChange={(e) => setFormData({ ...formData, rate_type: e.target.value as any })}
                    options={[
                      { value: 'per_km', label: 'Per KM' },
                      { value: 'per_ton', label: 'Per Ton' },
                      { value: 'per_trip', label: 'Per Trip' }
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Rate (₹) *
                  </label>
                  <Input
                    type="number"
                    value={formData.rate || ''}
                    onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                    placeholder="Enter rate"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Route (Optional)
                  </label>
                  <Input
                    type="text"
                    value={formData.route || ''}
                    onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                    placeholder="e.g., Mumbai to Pune"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Valid From *
                  </label>
                  <Input
                    type="date"
                    value={formData.valid_from || ''}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Valid To (Optional)
                  </label>
                  <Input
                    type="date"
                    value={formData.valid_to || ''}
                    onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Minimum Guarantee (₹)
                  </label>
                  <Input
                    type="number"
                    value={formData.min_guarantee || ''}
                    onChange={(e) => setFormData({ ...formData, min_guarantee: parseFloat(e.target.value) || undefined })}
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Vehicle Type
                  </label>
                  <Input
                    type="text"
                    value={formData.vehicle_type || ''}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    placeholder="e.g., 32 Feet, 20 Ton"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.fuel_adjustment || false}
                      onChange={(e) => setFormData({ ...formData, fuel_adjustment: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Include fuel price adjustment clause
                    </span>
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                    placeholder="Additional terms or notes..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ rate_type: 'per_km', fuel_adjustment: false });
                    setEditingId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  icon={<Save className="h-4 w-4" />}
                >
                  {editingId ? 'Update' : 'Save'} Contract
                </Button>
              </div>
            </div>
          )}

          {/* Contracts List */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Active Contracts ({contracts.length})
            </h3>
            
            {contracts.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No contracts found. Create your first contract to get started.
              </div>
            ) : (
              <div className="grid gap-4">
                {contracts.map((contract) => (
                  <div
                    key={contract.id}
                    className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            {contract.customer_name}
                          </h4>
                          {contract.fuel_adjustment && (
                            <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full">
                              Fuel Adjustment
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Type:</span>
                            <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                              {contract.rate_type.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Rate:</span>
                            <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                              ₹{contract.rate}
                            </span>
                          </div>
                          {contract.route && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Route:</span>
                              <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                                {contract.route}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Valid:</span>
                            <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                              {format(new Date(contract.valid_from), 'dd MMM yyyy')}
                              {contract.valid_to && ` - ${format(new Date(contract.valid_to), 'dd MMM yyyy')}`}
                            </span>
                          </div>
                        </div>

                        {contract.notes && (
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {contract.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          inputSize="sm"
                          onClick={() => handleEdit(contract)}
                          icon={<Edit2 className="h-3 w-3" />}
                        />
                        <Button
                          variant="outline"
                          inputSize="sm"
                          onClick={() => handleDelete(contract.id!)}
                          icon={<Trash2 className="h-3 w-3" />}
                          className="text-red-600 hover:text-red-700"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractRatesManager;

