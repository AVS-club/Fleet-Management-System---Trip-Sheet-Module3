import React, { useState } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Plus, Trash2, Wrench, DollarSign, FileText, CheckSquare } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

interface ServiceGroup {
  id: string;
  service_type: string;
  vendor: string;
  cost: number;
  parts_replaced: boolean;
  part_details?: string;
  notes?: string;
}

interface ServiceGroupsSectionProps {
  serviceGroups: ServiceGroup[];
  onChange: (groups: ServiceGroup[]) => void;
}

const ServiceGroupsSection: React.FC<ServiceGroupsSectionProps> = ({
  serviceGroups,
  onChange,
}) => {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const addServiceGroup = () => {
    const newGroup: ServiceGroup = {
      id: Date.now().toString(),
      service_type: '',
      vendor: '',
      cost: 0,
      parts_replaced: false,
      part_details: '',
      notes: '',
    };
    onChange([...serviceGroups, newGroup]);
  };

  const removeServiceGroup = (id: string) => {
    onChange(serviceGroups.filter(group => group.id !== id));
  };

  const updateServiceGroup = (id: string, field: keyof ServiceGroup, value: any) => {
    const updatedGroups = serviceGroups.map(group =>
      group.id === id ? { ...group, [field]: value } : group
    );
    onChange(updatedGroups);
  };

  const toggleExpanded = (id: string) => {
    setExpandedGroup(expandedGroup === id ? null : id);
  };

  const serviceTypes = [
    'Oil Change',
    'Brake Service',
    'Engine Repair',
    'Transmission Service',
    'Electrical Work',
    'Body Work',
    'Tire Service',
    'Battery Replacement',
    'Filter Replacement',
    'Other',
  ];

  return (
    <div className="maintenance-form-section">
      <div className="maintenance-form-section-header">
        <div className="icon">
          <Wrench className="h-5 w-5" />
        </div>
        <h3 className="section-title">Service Groups</h3>
      </div>

      <div className="space-y-4">
        {serviceGroups.map((group, index) => (
          <div
            key={group.id}
            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="card-title text-gray-900">
                Service Group {index + 1}
              </h4>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggleExpanded(group.id)}
                  icon={<FileText className="h-4 w-4" />}
                >
                  {expandedGroup === group.id ? 'Collapse' : 'Expand'}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => removeServiceGroup(group.id)}
                  icon={<Trash2 className="h-4 w-4" />}
                >
                  Remove
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label block text-gray-700 mb-1">
                  Service Type *
                </label>
                <Select
                  value={group.service_type}
                  onChange={(value) => updateServiceGroup(group.id, 'service_type', value)}
                  options={serviceTypes.map(type => ({ value: type, label: type }))}
                  placeholder="Select service type"
                />
              </div>

              <div>
                <Input
                  label="Vendor/Garage *"
                  value={group.vendor}
                  onChange={(e) => updateServiceGroup(group.id, 'vendor', e.target.value)}
                  placeholder="Enter vendor name"
                  icon={<Wrench className="h-4 w-4" />}
                />
              </div>

              <div>
                <Input
                  label="Cost (₹) *"
                  type="number"
                  value={group.cost}
                  onChange={(e) => updateServiceGroup(group.id, 'cost', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  icon={<DollarSign className="h-4 w-4" />}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`parts-${group.id}`}
                  checked={group.parts_replaced}
                  onChange={(e) => updateServiceGroup(group.id, 'parts_replaced', e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor={`parts-${group.id}`} className="form-label text-gray-700">
                  Parts Replaced
                </label>
              </div>
            </div>

            {group.parts_replaced && (
              <div className="mt-4">
                <Input
                  label="Part Details"
                  value={group.part_details || ''}
                  onChange={(e) => updateServiceGroup(group.id, 'part_details', e.target.value)}
                  placeholder="Describe parts replaced (e.g., brake pads, oil filter)"
                  icon={<CheckSquare className="h-4 w-4" />}
                />
              </div>
            )}

            {expandedGroup === group.id && (
              <div className="mt-4">
                <Input
                  label="Additional Notes"
                  value={group.notes || ''}
                  onChange={(e) => updateServiceGroup(group.id, 'notes', e.target.value)}
                  placeholder="Any additional notes about this service"
                  icon={<FileText className="h-4 w-4" />}
                />
              </div>
            )}
          </div>
        ))}

        <div className="flex justify-center pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={addServiceGroup}
            icon={<Plus className="h-4 w-4" />}
          >
            Add Service Group
          </Button>
        </div>

        {serviceGroups.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Wrench className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="card-title">No service groups added yet</p>
            <p className="card-subtitle">Click "Add Service Group" to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceGroupsSection;
