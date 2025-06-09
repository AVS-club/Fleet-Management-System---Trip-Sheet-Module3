import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import Button from '../ui/Button';
import { RCExtractedData } from '../../utils/ocrService';
import RCImageCropper from './RCImageCropper';
import type { PixelCrop } from 'react-image-crop';
import { motion } from 'framer-motion';

interface RCPreviewModalProps {
  details: RCExtractedData[];
  imageUrl?: string;
  onConfirm: (selectedDetails: RCExtractedData) => void;
  onManualSelect?: (croppedAreas: Record<string, PixelCrop>) => void;
  onClose: () => void;
}

const RCPreviewModal: React.FC<RCPreviewModalProps> = ({
  details,
  imageUrl,
  onConfirm,
  onManualSelect,
  onClose
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showRawText, setShowRawText] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);

  const currentDetails = details[selectedIndex];
  const isOCRFailed = currentDetails.registrationNumber === 'OCR_FAILED';

  const handleConfirm = () => {
    onConfirm(currentDetails);
  };

  const handleManualSelect = (croppedAreas: Record<string, PixelCrop>) => {
    if (onManualSelect) {
      onManualSelect(croppedAreas);
    }
  };

  if (isManualMode && imageUrl) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
        <div className="container mx-auto px-4 py-6">
          <RCImageCropper
            imageUrl={imageUrl}
            onComplete={handleManualSelect}
            onCancel={() => setIsManualMode(false)}
          />
        </div>
      </div>
    );
  }

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
                <h3 className="text-lg font-medium text-gray-900">
                  {isOCRFailed ? 'OCR Processing Result' : 'Extracted RC Details'}
                  {!isOCRFailed && details.length > 1 && ` (${selectedIndex + 1}/${details.length})`}
                </h3>
                {!isOCRFailed && details.length > 1 && (
                  <p className="text-sm text-gray-500 mt-1">
                    Multiple RC details found. Please select the correct one.
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isOCRFailed ? (
              <div className="mt-4">
                <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
                  <div className="flex">
                    <AlertTriangle className="h-5 w-5 text-warning-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <h4 className="text-warning-800 font-medium">Could not automatically extract RC details</h4>
                      <p className="text-warning-700 text-sm mt-1">
                        The automatic text recognition was unable to find the required information. You can:
                      </p>
                      <ul className="list-disc list-inside text-warning-700 text-sm mt-2">
                        <li>Try uploading a clearer image</li>
                        <li>Select the fields manually from the image</li>
                        <li>Enter the details manually in the form</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  {imageUrl && onManualSelect && (
                    <Button
                      onClick={() => setIsManualMode(true)}
                      className="w-full justify-center"
                      variant="primary"
                    >
                      Select Fields Manually
                    </Button>
                  )}
                  <Button
                    onClick={onClose}
                    className="w-full justify-center"
                    variant="outline"
                  >
                    Enter Details Manually
                  </Button>
                  <Button
                    onClick={onClose}
                    className="w-full justify-center"
                    variant="outline"
                  >
                    Try Different Image
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {details.length > 1 && (
                  <div className="flex space-x-2 mt-4">
                    {details.map((_, index) => (
                      <button
                        key={index}
                        className={`px-3 py-1 rounded-md text-sm font-medium ${
                          selectedIndex === index
                            ? 'bg-primary-100 text-primary-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        onClick={() => setSelectedIndex(index)}
                      >
                        RC {index + 1}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-4 space-y-4">
                  {Object.entries(currentDetails)
                    .filter(([key]) => key !== 'rawText')
                    .map(([key, value]) => (
                      value && (
                        <div key={key} className="flex items-center justify-between py-2 border-b">
                          <span className="text-sm font-medium text-gray-700">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span className="text-sm text-gray-900">{value}</span>
                        </div>
                      )
                    ))}
                </div>

                {currentDetails.rawText && (
                  <div className="mt-4">
                    <button
                      className="flex items-center text-sm text-gray-500 hover:text-gray-700"
                      onClick={() => setShowRawText(!showRawText)}
                    >
                      {showRawText ? (
                        <ChevronUp className="h-4 w-4 mr-1" />
                      ) : (
                        <ChevronDown className="h-4 w-4 mr-1" />
                      )}
                      {showRawText ? 'Hide Raw Text' : 'Show Raw Text'}
                    </button>
                    {showRawText && (
                      <pre className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 overflow-auto max-h-40">
                        {currentDetails.rawText}
                      </pre>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {!isOCRFailed && (
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <Button
                onClick={handleConfirm}
                icon={<CheckCircle className="h-4 w-4" />}
              >
                Use Selected Details
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className="mr-3"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default RCPreviewModal;