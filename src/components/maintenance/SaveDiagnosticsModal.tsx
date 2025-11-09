import React, { useState } from 'react';
import { CheckCircle, XCircle, Loader, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';

export type OperationStatus = 'pending' | 'in-progress' | 'success' | 'error';

export interface SaveOperation {
  id: string;
  label: string;
  status: OperationStatus;
  progress?: number; // 0-100
  error?: string;
  subOperations?: SaveOperation[];
}

interface SaveDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry?: (failedOperations: SaveOperation[]) => void;
  operations: SaveOperation[];
  allowPartialSave?: boolean;
  title?: string;
}

const SaveDiagnosticsModal: React.FC<SaveDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  onRetry,
  operations,
  allowPartialSave = false,
  title = 'Save Progress',
}) => {
  const [expandedOps, setExpandedOps] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const toggleExpand = (opId: string) => {
    const newExpanded = new Set(expandedOps);
    if (newExpanded.has(opId)) {
      newExpanded.delete(opId);
    } else {
      newExpanded.add(opId);
    }
    setExpandedOps(newExpanded);
  };

  const getStatusIcon = (status: OperationStatus) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-success-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-danger-600" />;
      case 'in-progress':
        return <Loader className="h-5 w-5 text-primary-600 animate-spin" />;
      case 'pending':
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStatusColor = (status: OperationStatus) => {
    switch (status) {
      case 'success':
        return 'text-success-700';
      case 'error':
        return 'text-danger-700';
      case 'in-progress':
        return 'text-primary-700';
      case 'pending':
        return 'text-gray-500';
    }
  };

  const countByStatus = () => {
    const count = { success: 0, error: 0, pending: 0, inProgress: 0 };

    const countOp = (op: SaveOperation) => {
      if (op.status === 'success') count.success++;
      else if (op.status === 'error') count.error++;
      else if (op.status === 'in-progress') count.inProgress++;
      else count.pending++;

      op.subOperations?.forEach(countOp);
    };

    operations.forEach(countOp);
    return count;
  };

  const getFailedOperations = (): SaveOperation[] => {
    const failed: SaveOperation[] = [];

    const collectFailed = (op: SaveOperation) => {
      if (op.status === 'error') {
        failed.push(op);
      }
      op.subOperations?.forEach(collectFailed);
    };

    operations.forEach(collectFailed);
    return failed;
  };

  const renderOperation = (op: SaveOperation, depth: number = 0) => {
    const hasSubOps = op.subOperations && op.subOperations.length > 0;
    const isExpanded = expandedOps.has(op.id);

    return (
      <div key={op.id} className={`${depth > 0 ? 'ml-6' : ''}`}>
        <div
          className={`flex items-center gap-3 p-3 rounded-lg ${
            depth === 0 ? 'bg-gray-50' : 'bg-white'
          } mb-2`}
        >
          {/* Expand/Collapse Button */}
          {hasSubOps && (
            <button
              onClick={() => toggleExpand(op.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}

          {/* Status Icon */}
          <div className="flex-shrink-0">{getStatusIcon(op.status)}</div>

          {/* Label */}
          <div className="flex-1 min-w-0">
            <p className={`font-medium ${getStatusColor(op.status)} truncate`}>
              {op.label}
            </p>
            {op.error && (
              <p className="text-sm text-danger-600 mt-1">{op.error}</p>
            )}
          </div>

          {/* Progress Bar */}
          {op.status === 'in-progress' && op.progress !== undefined && (
            <div className="flex-shrink-0 w-32">
              <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary-600 h-full transition-all duration-300"
                  style={{ width: `${op.progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 text-right mt-1">
                {op.progress}%
              </p>
            </div>
          )}

          {/* Success indicator */}
          {op.status === 'success' && (
            <span className="text-xs text-success-600 font-medium">
              Complete
            </span>
          )}
        </div>

        {/* Sub-operations */}
        {hasSubOps && isExpanded && (
          <div className="ml-4 border-l-2 border-gray-200 pl-2">
            {op.subOperations!.map((subOp) => renderOperation(subOp, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const statusCounts = countByStatus();
  const failedOps = getFailedOperations();
  const isComplete =
    statusCounts.inProgress === 0 && statusCounts.pending === 0;
  const hasErrors = statusCounts.error > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        </div>

        {/* Operations List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {operations.map((op) => renderOperation(op))}
        </div>

        {/* Summary */}
        {isComplete && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-4">
              {hasErrors ? (
                <AlertTriangle className="h-6 w-6 text-warning-600 flex-shrink-0" />
              ) : (
                <CheckCircle className="h-6 w-6 text-success-600 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="font-semibold text-gray-900">
                  {hasErrors ? 'Save Completed with Errors' : 'Save Completed Successfully'}
                </p>
                <div className="flex gap-4 mt-1 text-sm">
                  <span className="text-success-700">
                    ✓ {statusCounts.success} succeeded
                  </span>
                  {hasErrors && (
                    <span className="text-danger-700">
                      ✗ {statusCounts.error} failed
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Error Messages */}
            {hasErrors && failedOps.length > 0 && (
              <div className="mt-4 p-3 bg-danger-50 rounded-lg border border-danger-200">
                <p className="font-medium text-danger-900 mb-2">Failed Operations:</p>
                <ul className="text-sm text-danger-700 space-y-1">
                  {failedOps.map((op) => (
                    <li key={op.id}>
                      • {op.label}: {op.error || 'Unknown error'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
          {isComplete && hasErrors && onRetry && (
            <Button
              variant="outline"
              onClick={() => onRetry(failedOps)}
              className="border-warning-600 text-warning-700 hover:bg-warning-50"
            >
              Retry Failed
            </Button>
          )}
          {isComplete && (
            <Button onClick={onClose}>
              {hasErrors && allowPartialSave ? 'Continue Anyway' : 'Close'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SaveDiagnosticsModal;
