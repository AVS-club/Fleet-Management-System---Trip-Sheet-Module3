import React from 'react';
import { X, AlertTriangle, Info, Trash2, Archive } from 'lucide-react';
import Button from '../ui/Button';

interface ConfirmationModalProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isOpen: boolean;
  type?: 'delete' | 'archive' | 'info' | 'warning';
  isLoading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isOpen,
  type = 'warning',
  isLoading = false
}) => {
  if (!isOpen) return null;

  // Determine icon and color scheme based on type
  const getIconAndColor = () => {
    switch (type) {
      case 'delete':
        return {
          icon: <Trash2 className="h-6 w-6 text-error-500" />,
          bgColor: 'bg-error-50',
          borderColor: 'border-error-200',
          textColor: 'text-error-800',
          buttonColor: 'bg-error-600 hover:bg-error-700 focus:ring-error-500'
        };
      case 'archive':
        return {
          icon: <Archive className="h-6 w-6 text-warning-500" />,
          bgColor: 'bg-warning-50',
          borderColor: 'border-warning-200',
          textColor: 'text-warning-800',
          buttonColor: 'bg-warning-600 hover:bg-warning-700 focus:ring-warning-500'
        };
      case 'info':
        return {
          icon: <Info className="h-6 w-6 text-blue-500" />,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          buttonColor: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
        };
      case 'warning':
      default:
        return {
          icon: <AlertTriangle className="h-6 w-6 text-warning-500" />,
          bgColor: 'bg-warning-50',
          borderColor: 'border-warning-200',
          textColor: 'text-warning-800',
          buttonColor: 'bg-warning-600 hover:bg-warning-700 focus:ring-warning-500'
        };
    }
  };

  const { icon, bgColor, borderColor, textColor, buttonColor } = getIconAndColor();

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Background overlay */}
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          aria-hidden="true"
          onClick={onCancel}
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${bgColor} sm:mx-0 sm:h-10 sm:w-10`}>
                {icon}
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className={`text-lg leading-6 font-medium ${textColor}`} id="modal-title">
                  {title}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    {message}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <Button
              className={`w-full sm:w-auto sm:ml-3 ${type === 'delete' ? 'bg-error-600 hover:bg-error-700' : ''}`}
              onClick={onConfirm}
              isLoading={isLoading}
              variant={type === 'delete' ? 'danger' : type === 'archive' ? 'warning' : 'primary'}
            >
              {confirmText}
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto mt-3 sm:mt-0"
              onClick={onCancel}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;