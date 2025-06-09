import React from 'react';
import { X, FileText, Calendar, AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import { motion } from 'framer-motion';

interface InsurancePreviewModalProps {
  details: InsuranceDetails;
  imageUrl?: string;
  onConfirm: (details: InsuranceDetails) => void;
  onClose: () => void;
}

interface InsuranceDetails {
  policyNumber?: string;
  insurerName?: string;
  validFrom?: string;
  validUntil?: string;
  vehicleNumber?: string;
  coverage?: string;
  premium?: number;
  confidence?: number;
  rawText?: string;
}

const InsurancePreviewModal: React.FC<InsurancePreviewModalProps> = ({
  details,
  imageUrl,
  onConfirm,
  onClose
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Insurance Document Details</h3>
                <p className="mt-1 text-sm text-gray-500">Review extracted information</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {details.policyNumber && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm font-medium text-gray-500">Policy Number</span>
                  <span className="text-sm text-gray-900">{details.policyNumber}</span>
                </div>
              )}

              {details.insurerName && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm font-medium text-gray-500">Insurer</span>
                  <span className="text-sm text-gray-900">{details.insurerName}</span>
                </div>
              )}

              {details.validFrom && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm font-medium text-gray-500">Valid From</span>
                  <span className="text-sm text-gray-900">{new Date(details.validFrom).toLocaleDateString()}</span>
                </div>
              )}

              {details.validUntil && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm font-medium text-gray-500">Valid Until</span>
                  <span className="text-sm text-gray-900">{new Date(details.validUntil).toLocaleDateString()}</span>
                </div>
              )}

              {details.vehicleNumber && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm font-medium text-gray-500">Vehicle Number</span>
                  <span className="text-sm text-gray-900">{details.vehicleNumber}</span>
                </div>
              )}

              {details.coverage && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm font-medium text-gray-500">Coverage</span>
                  <span className="text-sm text-gray-900">{details.coverage}</span>
                </div>
              )}

              {details.premium && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm font-medium text-gray-500">Premium</span>
                  <span className="text-sm text-gray-900">₹{details.premium.toLocaleString()}</span>
                </div>
              )}

              {details.confidence && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center text-sm text-gray-600">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    <span>Extraction Confidence: {(details.confidence * 100).toFixed(1)}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <Button
              onClick={() => onConfirm(details)}
              className="w-full sm:w-auto sm:ml-3"
            >
              Use These Details
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="mt-3 sm:mt-0 w-full sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default InsurancePreviewModal;