import React, { useState, useEffect } from 'react';
import { X, Clock, Plus, Minus, Truck } from 'lucide-react';
import Button from '../ui/Button';
import { supabase } from '../../utils/supabaseClient';
import LoadingScreen from '../LoadingScreen';
import { format } from 'date-fns';
import { createLogger } from '../../utils/logger';

const logger = createLogger('TagHistoryModal');

interface TagHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tagId: string;
  tagName: string;
  tagColor: string;
}

const TagHistoryModal: React.FC<TagHistoryModalProps> = ({
  isOpen,
  onClose,
  tagId,
  tagName,
  tagColor
}) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && tagId) {
      loadHistory();
    }
  }, [isOpen, tagId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicle_tag_history')
        .select(`
          *,
          vehicles (
            id,
            registration_number,
            make,
            model
          )
        `)
        .eq('tag_id', tagId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      logger.error('Error loading tag history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          aria-hidden="true"
          onClick={onClose}
        />

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: tagColor }}
                />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Tag History — {tagName}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Complete audit trail of vehicles added/removed from this tag
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* History List */}
            <div className="mt-4">
              {loading ? (
                <div className="py-12">
                  <LoadingScreen isLoading={true} />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No history available for this tag</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className={`
                        mt-0.5 p-2 rounded-full flex-shrink-0
                        ${item.action === 'added' ? 'bg-green-100' : 'bg-red-100'}
                      `}>
                        {item.action === 'added' ? (
                          <Plus className="h-4 w-4 text-green-600" />
                        ) : (
                          <Minus className="h-4 w-4 text-red-600" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <Truck className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <p className="text-sm font-medium text-gray-900">
                            {item.vehicles?.registration_number || 'Unknown Vehicle'}
                          </p>
                          <span className={`
                            text-xs px-2 py-0.5 rounded-full flex-shrink-0
                            ${item.action === 'added' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'}
                          `}>
                            {item.action === 'added' ? 'Added' : 'Removed'}
                          </span>
                        </div>
                        {item.vehicles?.make && item.vehicles?.model && (
                          <p className="text-xs text-gray-500 mb-1">
                            {item.vehicles.make} {item.vehicles.model}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          {format(new Date(item.changed_at), 'MMM dd, yyyy • h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <Button onClick={onClose} className="w-full sm:w-auto">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TagHistoryModal;

