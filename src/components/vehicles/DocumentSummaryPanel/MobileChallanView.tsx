/**
 * MobileChallanView - Challan summary and details for mobile
 * 
 * Features:
 * - Shows challan count and pending amount
 * - Displays last checked time
 * - Expandable to show challan details
 * - Refresh button
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ChevronDown, ChevronUp, Clock, IndianRupee, Calendar, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Challan {
  challan_no: string;
  date: string;
  amount: number | string;
  status: string;
  offence: string;
  area?: string;
  state?: string;
}

interface MobileChallanViewProps {
  totalChallans?: number;
  pendingAmount?: number;
  lastChecked?: string;
  challans?: Challan[];
  onRefresh: () => void;
  isRefreshing: boolean;
  onViewAll?: () => void;
}

export const MobileChallanView: React.FC<MobileChallanViewProps> = ({
  totalChallans = 0,
  pendingAmount = 0,
  lastChecked,
  challans = [],
  onRefresh,
  isRefreshing,
  onViewAll
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getLastCheckedText = () => {
    if (!lastChecked) return 'Never checked';
    try {
      return formatDistanceToNow(new Date(lastChecked), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  const pendingChallans = challans.filter(c => c.status !== 'Paid');
  const hasPendingChallans = pendingChallans.length > 0;

  return (
    <div className="mt-3">
      {/* Collapsed Summary */}
      <div
        className={`rounded-lg border-2 overflow-hidden ${
          hasPendingChallans 
            ? 'border-yellow-300 bg-yellow-50' 
            : 'border-green-300 bg-green-50'
        }`}
      >
        <button
          onClick={() => totalChallans > 0 && setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between touch-manipulation active:opacity-80"
          disabled={totalChallans === 0}
        >
          <div className="flex items-center gap-2 flex-1 text-left">
            <AlertTriangle className={`h-5 w-5 ${hasPendingChallans ? 'text-yellow-700' : 'text-green-700'}`} />
            <div>
              <div className={`text-sm font-semibold ${hasPendingChallans ? 'text-yellow-900' : 'text-green-900'}`}>
                {totalChallans === 0 ? 'No Challans' : `${totalChallans} Challan${totalChallans > 1 ? 's' : ''}`}
                {pendingChallans.length > 0 && ` • ${pendingChallans.length} Pending`}
              </div>
              {pendingAmount > 0 && (
                <div className="flex items-center gap-1 text-xs text-yellow-700 font-medium mt-0.5">
                  <IndianRupee className="h-3 w-3" />
                  <span>{pendingAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-gray-600 mt-0.5">
                <Clock className="h-3 w-3" />
                <span>Checked {getLastCheckedText()}</span>
              </div>
            </div>
          </div>

          {totalChallans > 0 && (
            <div>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </div>
          )}
        </button>

        {/* Expanded Challan List */}
        <AnimatePresence>
          {isExpanded && totalChallans > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-yellow-200"
            >
              <div className="px-4 py-3 space-y-2 max-h-60 overflow-y-auto">
                {challans.slice(0, 3).map((challan, index) => {
                  const isPending = challan.status !== 'Paid';
                  const amount = typeof challan.amount === 'string' 
                    ? parseFloat(challan.amount) || 0 
                    : challan.amount;

                  return (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        isPending 
                          ? 'bg-white border-yellow-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="text-xs font-semibold text-gray-900">
                          {challan.challan_no}
                        </div>
                        <div className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          isPending 
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {challan.status}
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-700 mb-1">
                        {challan.offence}
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3 text-gray-600">
                          {challan.date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{challan.date}</span>
                            </div>
                          )}
                          {challan.area && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{challan.area}</span>
                            </div>
                          )}
                        </div>
                        
                        {amount > 0 && (
                          <div className="flex items-center gap-1 font-semibold text-gray-900">
                            <IndianRupee className="h-3 w-3" />
                            <span>{amount.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {challans.length > 3 && onViewAll && (
                  <button
                    onClick={onViewAll}
                    className="w-full py-2 text-xs font-medium text-yellow-700 hover:text-yellow-800"
                  >
                    View all {challans.length} challans
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

