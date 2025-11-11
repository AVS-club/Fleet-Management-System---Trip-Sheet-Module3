import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Fuel, X, Package, IndianRupee } from 'lucide-react';
import { createLogger } from '../../utils/logger';

const logger = createLogger('FuelDetailsPrompt');

interface FuelDetailsPromptProps {
  isOpen: boolean;
  onAddFuel: () => void;
  onSaveWithoutFuel: () => void;
  onDismiss: () => void;
  onConfirmSave: () => void;
  isMobile: boolean;
  hasFuelWarning?: boolean;
  hasGrossWeightWarning?: boolean;
  hasExpensesWarning?: boolean;
}

const FuelDetailsPrompt: React.FC<FuelDetailsPromptProps> = ({
  isOpen,
  onAddFuel,
  onSaveWithoutFuel,
  onDismiss,
  onConfirmSave,
  isMobile,
  hasFuelWarning = true,
  hasGrossWeightWarning = false,
  hasExpensesWarning = false
}) => {
  const [timeLeft, setTimeLeft] = useState(3);
  const [isPaused, setIsPaused] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management
  useEffect(() => {
    if (isOpen && primaryButtonRef.current) {
      primaryButtonRef.current.focus();
    }
  }, [isOpen]);

  // Countdown logic
  useEffect(() => {
    if (isOpen && !isPaused) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 0.1) {
            onSaveWithoutFuel();
            return 0;
          }
          return prev - 0.1;
        });
      }, 100);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isOpen, isPaused, onSaveWithoutFuel]);

  // Update progress bar
  useEffect(() => {
    if (progressRef.current) {
      const percentage = ((3 - timeLeft) / 3) * 100;
      progressRef.current.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
    }
  }, [timeLeft]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isMobile) {
          setShowConfirm(true);
        } else {
          onDismiss();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, isMobile, onDismiss]);

  const handleAddFuel = useCallback(() => {
    logger.info('fuel_prompt_choice: add');
    onAddFuel();
  }, [onAddFuel]);

  const handleSaveWithoutFuel = useCallback(() => {
    logger.info('fuel_prompt_choice: save');
    onSaveWithoutFuel();
  }, [onSaveWithoutFuel]);

  const handleDismiss = useCallback(() => {
    logger.info('fuel_prompt_choice: dismiss');
    onDismiss();
  }, [onDismiss]);

  const handleConfirmSave = useCallback(() => {
    logger.info('fuel_prompt_choice: save');
    onConfirmSave();
    setShowConfirm(false);
  }, [onConfirmSave]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (isMobile) {
        setShowConfirm(true);
      } else {
        onDismiss();
      }
    }
  }, [isMobile, onDismiss]);

  const handlePointerDown = useCallback(() => {
    setIsPaused(true);
  }, []);

  const handlePointerUp = useCallback(() => {
    setIsPaused(false);
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* Main Modal */}
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
        onClick={handleBackdropClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <div 
          className="w-[90vw] max-w-[360px] sm:max-w-[420px] rounded-2xl bg-white p-4 sm:p-5 shadow-xl animate-in fade-in-0 slide-in-from-bottom-2 duration-120"
          role="dialog"
          aria-labelledby="fuel-prompt-title"
        >
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <Fuel className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h6 id="fuel-prompt-title" className="text-base font-semibold text-slate-900">
                {(hasFuelWarning && hasGrossWeightWarning) || (hasFuelWarning && hasExpensesWarning) || (hasGrossWeightWarning && hasExpensesWarning) || (hasFuelWarning && hasGrossWeightWarning && hasExpensesWarning)
                  ? 'Add missing details?' 
                  : hasFuelWarning 
                    ? 'Add fuel details?' 
                    : hasGrossWeightWarning
                      ? 'Gross weight not added'
                      : 'Expenses not added'}
              </h6>
              <div className="mt-1.5 text-sm text-slate-600 space-y-2">
                {hasFuelWarning && (
                  <div>
                    <p>No refueling is added for this trip.</p>
                    <p>Save now or add fuel details to track mileage and cost.</p>
                  </div>
                )}
                {hasGrossWeightWarning && (
                  <div className={hasFuelWarning ? "pt-2 border-t border-slate-200" : ""}>
                    <div className="flex items-start gap-2">
                      <Package className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-slate-700">Gross weight not added</p>
                        <p className="text-xs text-slate-600 mt-0.5">Was the truck traveling without any load? Trip will be saved automatically.</p>
                      </div>
                    </div>
                  </div>
                )}
                {hasExpensesWarning && (
                  <div className={(hasFuelWarning || hasGrossWeightWarning) ? "pt-2 border-t border-slate-200" : ""}>
                    <div className="flex items-start gap-2">
                      <IndianRupee className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-slate-700">No expenses added</p>
                        <p className="text-xs text-slate-600 mt-0.5">Only toll expense is auto-calculated. Add unloading, driver, or other expenses to track trip costs.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status Row */}
          <div className="mt-3 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm text-slate-600">Auto-saving in</span>
            <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div 
                ref={progressRef}
                className="h-full w-0 bg-emerald-500/80 transition-[width] duration-100 ease-linear"
              />
            </div>
            <span className="text-sm font-medium text-slate-900 min-w-[2rem] text-right">
              {timeLeft.toFixed(1)}s
            </span>
          </div>

          {/* Buttons */}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-between">
            {hasFuelWarning && (
              <button
                ref={primaryButtonRef}
                onClick={handleAddFuel}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors"
              >
                <Fuel className="h-4 w-4 mr-2" />
                Add Fuel Details
              </button>
            )}
            <button
              ref={!hasFuelWarning ? primaryButtonRef : undefined}
              onClick={handleSaveWithoutFuel}
              className={`inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 font-medium text-emerald-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors ${hasFuelWarning ? '' : 'w-full sm:w-auto'}`}
            >
              {hasFuelWarning ? 'Save without fuel' : 'Save trip'}
            </button>
          </div>

          {/* Helper Text */}
          {hasFuelWarning && (
            <p className="mt-3 text-[12px] text-slate-500 text-center">
              Adding fuel helps track vehicle efficiency & maintenance.
            </p>
          )}
        </div>
      </div>

      {/* Mobile Confirmation Sheet */}
      {showConfirm && isMobile && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/20 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Save without fuel?
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              You can add fuel later from the trip.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 h-11 rounded-xl border border-slate-200 bg-white px-4 font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                Go back
              </button>
              <button
                onClick={handleConfirmSave}
                className="flex-1 h-11 rounded-xl bg-emerald-600 px-4 font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FuelDetailsPrompt;
