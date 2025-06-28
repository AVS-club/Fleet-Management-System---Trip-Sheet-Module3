import React, { useState } from 'react';
import { X, MessageSquare } from 'lucide-react';
import { Vehicle } from '../../types';
import Button from '../ui/Button';

interface VehicleWhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle;
  contactNumber?: string;
}

const VehicleWhatsAppShareModal: React.FC<VehicleWhatsAppShareModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  contactNumber = ''
}) => {
  if (!isOpen) return null;
  
  // Format phone number - remove spaces, dashes, brackets, etc.
  const formatPhoneNumber = (phone: string) => {
    // Remove all non-numeric characters
    let formattedNumber = phone.replace(/\D/g, '');
    
    // If the number doesn't start with a country code, add India's code (+91)
    if (!formattedNumber.startsWith('91') && formattedNumber.length === 10) {
      formattedNumber = '91' + formattedNumber;
    }
    
    return formattedNumber;
  };
  
  // Generate Vehicle Details message
  const generateVehicleDetailsMessage = () => {
    return encodeURIComponent(
      `🚛 *Vehicle Snapshot (Auto Vital Solution)*\n\n` +
      `📌 *Registration:* ${vehicle.registration_number}\n` +
      `🏷️ *Make & Model:* ${vehicle.make} ${vehicle.model} (${vehicle.year})\n` +
      `🛞 *Type:* ${vehicle.type.charAt(0).toUpperCase() + vehicle.type.slice(1)} | ${vehicle.fuel_type.charAt(0).toUpperCase() + vehicle.fuel_type.slice(1)}\n` +
      `⚙️ *Engine No:* ${vehicle.engine_number || 'N/A'}\n` +
      `🔩 *Chassis No:* ${vehicle.chassis_number || 'N/A'}\n` +
      `⚖️ *GVW/ULW:* ${vehicle.unladen_weight ? `${vehicle.unladen_weight} kg` : 'N/A'} ${vehicle.unladen_weight ? '/ N/A' : ''}\n` +
      `🛣️ *Current Odometer:* ${vehicle.current_odometer.toLocaleString()} km\n` +
      `📦 *Axle Count:* ${vehicle.cylinders || 'N/A'} | *Wheelbase:* ${vehicle.wheelbase || 'N/A'}\n` +
      `🎨 *Color:* ${vehicle.color || 'N/A'} | *Body Type:* ${vehicle.vehicle_class || 'N/A'}\n` +
      `🧾 *Owner:* ${vehicle.owner_name || 'N/A'}\n\n` +
      `✅ Track & manage your fleet on: www.autovitalsolution.com`
    );
  };
  
  // Generate Document Expiry message
  const generateDocumentExpiryMessage = () => {
    return encodeURIComponent(
      `📄 *Document Validity (Auto Vital Solution)*\n\n` +
      `🛻 ${vehicle.registration_number} - ${vehicle.make} ${vehicle.model}\n\n` +
      `🧾 *RC Expiry:* ${vehicle.rc_expiry_date ? new Date(vehicle.rc_expiry_date).toLocaleDateString() : 'N/A'}\n` +
      `🛡️ *Insurance:* ${vehicle.insurance_expiry_date ? new Date(vehicle.insurance_expiry_date).toLocaleDateString() : 'N/A'}\n` +
      `📝 *Fitness:* ${vehicle.fitness_expiry_date ? new Date(vehicle.fitness_expiry_date).toLocaleDateString() : 'N/A'}\n` +
      `🚦 *Permit:* ${vehicle.permit_expiry_date ? new Date(vehicle.permit_expiry_date).toLocaleDateString() : 'N/A'}\n` +
      `🌬️ *PUC:* ${vehicle.puc_expiry_date ? new Date(vehicle.puc_expiry_date).toLocaleDateString() : 'N/A'}\n` +
      `💰 *Tax Paid Until:* ${vehicle.tax_paid_upto ? new Date(vehicle.tax_paid_upto).toLocaleDateString() : 'N/A'}\n\n` +
      `✅ Track & manage your fleet on: www.autovitalsolution.com`
    );
  };
  
  // Handle share on WhatsApp
  const handleShareVehicleDetails = () => {
    if (!contactNumber) return;
    
    const formattedPhone = formatPhoneNumber(contactNumber);
    const message = generateVehicleDetailsMessage();
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
    onClose();
  };
  
  const handleShareDocumentDates = () => {
    if (!contactNumber) return;
    
    const formattedPhone = formatPhoneNumber(contactNumber);
    const message = generateDocumentExpiryMessage();
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Share Vehicle Info</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-500">
            Select what information you'd like to share via WhatsApp to {contactNumber || 'contact'}:
          </p>
          
          <Button
            onClick={handleShareVehicleDetails}
            className="w-full justify-between"
            disabled={!contactNumber}
          >
            <span>Vehicle Details</span>
            <MessageSquare className="h-4 w-4 text-green-100" />
          </Button>
          
          <Button
            onClick={handleShareDocumentDates}
            className="w-full justify-between"
            disabled={!contactNumber}
          >
            <span>Document Dates</span>
            <MessageSquare className="h-4 w-4 text-green-100" />
          </Button>
          
          {!contactNumber && (
            <div className="bg-yellow-50 p-3 rounded-md border border-yellow-100 text-yellow-700 text-sm">
              No contact number available. Please add a contact number to the vehicle or driver.
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VehicleWhatsAppShareModal;