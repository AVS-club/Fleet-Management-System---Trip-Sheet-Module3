import React, { useState } from 'react';
import { X } from 'lucide-react';
import Button from '../ui/Button';
import Select from '../ui/Select';

interface AlertActionModalProps {
  type: 'accept' | 'deny' | 'ignore';
  onSubmit: (reason: string, duration?: 'week' | 'permanent') => void;
  onClose: () => void;
}

const AlertActionModal: React.FC<AlertActionModalProps> = ({
  type,
  onSubmit,
  onClose
}) => {
  const [reason, setReason] = useState('');
  const [selectedOption, setSelectedOption] = useState('');
  const [duration, setDuration] = useState<'week' | 'permanent'>('week');

  const getTitle = () => {
    switch (type) {
      case 'accept':
        return 'Why are you accepting this alert?';
      case 'deny':
        return 'Why do you think this alert is incorrect?';
      case 'ignore':
        return 'Ignore Alert';
      default:
        return '';
    }
  };

  const getOptions = () => {
    switch (type) {
      case 'accept':
        return [
          { value: 'confirmed', label: 'Confirmed issue' },
          { value: 'handled', label: 'Already handled manually' },
          { value: 'resolved', label: 'Resolved by vendor' }
        ];
      case 'deny':
        return [
          { value: 'false_reading', label: 'False reading' },
          { value: 'wrong_vehicle', label: 'Wrong vehicle matched' },
          { value: 'data_sync', label: 'Data sync error' }
        ];
      default:
        return [];
    }
  };

  const handleSubmit = () => {
    if (type === 'ignore') {
      onSubmit(reason, duration);
    } else {
      onSubmit(reason || selectedOption);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-medium text-gray-900">{getTitle()}</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {type !== 'ignore' && (
                <Select
                  options={getOptions()}
                  value={selectedOption}
                  onChange={(e) => setSelectedOption(e.target.value)}
                  placeholder="Select a reason"
                />
              )}

              {type === 'ignore' && (
                <div className="space-y-4">
                  <div className="flex space-x-4">
                    <button
                      className={`px-4 py-2 rounded-md ${
                        duration === 'week'
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                      onClick={() => setDuration('week')}
                    >
                      Ignore for this week
                    </button>
                    <button
                      className={`px-4 py-2 rounded-md ${
                        duration === 'permanent'
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                      onClick={() => setDuration('permanent')}
                    >
                      Ignore permanently
                    </button>
                  </div>
                </div>
              )}

              <textarea
                className="w-full p-2 border rounded-md"
                placeholder={type === 'ignore' ? 'Reason (optional)' : 'Additional comments (optional)'}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <Button
              onClick={handleSubmit}
              className="w-full sm:w-auto sm:ml-3"
            >
              {type === 'ignore' ? 'Confirm' : 'Submit'}
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
    </div>
  );
};

export default AlertActionModal;