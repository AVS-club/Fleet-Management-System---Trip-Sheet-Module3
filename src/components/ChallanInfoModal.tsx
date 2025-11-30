import React from 'react';
import { AlertCircle, Calendar, MapPin, User, FileText, IndianRupee, X } from "lucide-react";
import { format } from "date-fns";
import type { ChallanInfo } from "@/hooks/useChallanInfo";

interface ChallanInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  challanData: ChallanInfo | null;
  vehicleNumber?: string;
}

export const ChallanInfoModal: React.FC<ChallanInfoModalProps> = ({
  isOpen,
  onClose,
  challanData,
  vehicleNumber
}) => {
  if (!isOpen || !challanData) return null;

  const totalPending = challanData.challans
    .filter(c => c.challan_status !== 'Paid')
    .reduce((sum, c) => {
      const amount = typeof c.amount === 'string' ? parseFloat(c.amount) || 0 : c.amount;
      return sum + amount;
    }, 0);

  const totalPaid = challanData.challans
    .filter(c => c.challan_status === 'Paid')
    .reduce((sum, c) => {
      const amount = typeof c.amount === 'string' ? parseFloat(c.amount) || 0 : c.amount;
      return sum + amount;
    }, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl max-h-[80vh] bg-white rounded-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-yellow-500" />
            Challan Information - {vehicleNumber || challanData.vehicleId}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-6 space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Challans</p>
              <p className="text-2xl font-bold">{challanData.total}</p>
            </div>
            
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-sm text-red-600">Pending Amount</p>
              <p className="text-2xl font-bold text-red-600">₹{totalPending}</p>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600">Paid Amount</p>
              <p className="text-2xl font-bold text-green-600">₹{totalPaid}</p>
            </div>
          </div>

          {/* Challan List */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-4">
            {challanData.challans.length === 0 ? (
              <div className="bg-green-50 rounded-lg p-8 text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-green-500 mb-2" />
                <p className="text-lg font-medium">No Challans Found</p>
                <p className="text-sm text-gray-600">
                  This vehicle has no traffic violations recorded.
                </p>
              </div>
            ) : (
              challanData.challans.map((challan, index) => (
                <div key={challan.challan_no || index} className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {challan.challan_no}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3" />
                        {challan.date || 'Date not available'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        challan.challan_status === 'Paid' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {challan.challan_status}
                      </span>
                      <p className="text-lg font-bold mt-1">
                        <IndianRupee className="inline h-4 w-4" />
                        {challan.amount || 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3 text-gray-500" />
                      <span className="text-gray-600">Accused:</span>
                      <span className="font-medium">{challan.accused_name}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-gray-500" />
                      <span className="text-gray-600">Location:</span>
                      <span className="font-medium">{challan.area}, {challan.state}</span>
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">Offence:</p>
                    <p className="text-sm font-medium">{challan.offence}</p>
                    
                    {challan.offences && challan.offences.length > 0 && (
                      <ul className="mt-1 space-y-1">
                        {challan.offences.map((off, idx) => (
                          <li key={idx} className="text-xs text-gray-500 pl-3">
                            • {off.offence_name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
