import React, { useEffect, useMemo, useState } from 'react';
import { Truck } from 'lucide-react';

interface LoadingScreenProps {
  isLoading: boolean;
}

const statusSteps = [
  'Linking live fleet telemetry…',
  'Syncing driver schedules…',
  'Calibrating performance KPIs…',
  'Preparing smart alerts…',
];

const tips = [
  'Pro tip: Pin your most-used vehicles from the fleet list.',
  'Switch to dark mode from your avatar menu after dusk.',
  'Drop trip slips directly on the timeline to upload instantly.',
  'Need help? Press ? anywhere to open the command palette.',
];

const LoadingScreen: React.FC<LoadingScreenProps> = ({ isLoading }) => {
  const [statusIndex, setStatusIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(isLoading);
  const featuredTip = useMemo(
    () => tips[Math.floor(Math.random() * tips.length)],
    []
  );

  useEffect(() => {
    if (!isLoading) return;
    const rotation = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statusSteps.length);
    }, 1600);
    return () => clearInterval(rotation);
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) {
      setIsVisible(true);
      return;
    }
    const timeout = setTimeout(() => setIsVisible(false), 500);
    return () => clearTimeout(timeout);
  }, [isLoading]);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#f6fbff] via-white to-[#e7f5ff] dark:from-gray-950 dark:via-gray-950 dark:to-black transition-opacity duration-500 ${
        isLoading ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      aria-live="polite"
      aria-busy={isLoading}
    >
      {/* Ambient background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(42,139,242,0.18),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(46,211,183,0.2),_transparent_42%)]" />
      <div className="absolute inset-y-0 -left-10 w-72 bg-gradient-to-b from-[#2ed3b7]/40 via-transparent to-transparent blur-3xl animate-[orbFloat_8s_ease-in-out_infinite]" />
      <div className="absolute inset-y-0 -right-8 w-72 bg-gradient-to-t from-[#2a8bf2]/35 via-transparent to-transparent blur-3xl animate-[orbFloat_9s_ease-in-out_infinite_1.5s]" />

      <div className="relative z-10 w-full max-w-md px-10 py-12 text-center rounded-[36px] border border-white/40 bg-white/70 shadow-[0_25px_60px_rgba(15,23,42,0.25)] backdrop-blur-2xl dark:bg-gray-900/70 dark:border-white/5">
        <div className="flex flex-col items-center space-y-6">
          {/* Logo */}
          <div className="relative">
            <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-primary-400/30 to-secondary-400/30 blur-2xl animate-[glowPulse_4s_ease-in-out_infinite]" />
            <div className="relative bg-white/90 dark:bg-gray-900/90 rounded-[28px] p-5 shadow-inner border border-white/50 dark:border-gray-800/60">
              <img
                src="/assets/AVS-LOGO-512x512-new.png"
                alt="Auto Vital Solution"
                className="h-20 w-20 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <Truck className="hidden h-20 w-20 text-primary-600" />
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-gray-500 dark:text-gray-400 mb-2">
              Auto Vital Solution
            </p>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
              Intelligent Fleet
            </h1>
            <p className="text-base text-gray-500 dark:text-gray-300">
              Preparing your workspace
            </p>
          </div>

          {/* Premium spinner */}
          <div className="relative flex flex-col items-center space-y-4">
            <svg
              className="h-28 w-28"
              viewBox="0 0 120 120"
              fill="none"
              role="img"
              aria-label="Loading indicator"
            >
              <defs>
                <linearGradient id="avs-loader" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="#2ED3B7" />
                  <stop offset="100%" stopColor="#2A8BF2" />
                </linearGradient>
              </defs>
              <circle
                className="text-gray-200 dark:text-gray-800"
                cx="60"
                cy="60"
                r="46"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                opacity="0.4"
              />
              <circle
                cx="60"
                cy="60"
                r="46"
                stroke="url(#avs-loader)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="280"
                strokeDashoffset="180"
                className="animate-[dash_1.8s_ease-in-out_infinite]"
              />
            </svg>
            <div className="w-48">
              <div className="relative h-1.5 rounded-full bg-slate-200/70 dark:bg-gray-800 overflow-hidden">
                <span className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-[#2ED3B7] via-[#3ac6dc] to-[#2A8BF2] animate-[slideProgress_1.6s_ease-in-out_infinite]" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {statusSteps[statusIndex]}
            </p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 px-4 text-center text-xs text-gray-600 dark:text-gray-400">
        Tip: {featuredTip}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes slideProgress {
            0% {
              transform: translateX(-100%);
            }
            50% {
              transform: translateX(150%);
            }
            100% {
              transform: translateX(-100%);
            }
          }
          @keyframes dash {
            0% {
              stroke-dashoffset: 280;
            }
            50% {
              stroke-dashoffset: 40;
            }
            100% {
              stroke-dashoffset: 280;
            }
          }
          @keyframes orbFloat {
            0%,
            100% {
              transform: translateY(0px) scale(0.95);
            }
            50% {
              transform: translateY(-30px) scale(1.05);
            }
          }
          @keyframes glowPulse {
            0%,
            100% {
              opacity: 0.5;
            }
            50% {
              opacity: 1;
            }
          }
        `
      }} />
    </div>
  );
};

export default LoadingScreen;