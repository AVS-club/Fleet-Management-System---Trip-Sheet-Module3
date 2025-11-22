import React, { useEffect, useState, useRef } from 'react';
import { Home, Bell, RefreshCw } from 'lucide-react';

interface CollapsibleHeaderProps {
  activeVehicles: number;
  totalAlerts: number;
  pendingAlerts: number;
  activeTrips: number;
  maintenanceTasks: number;
  isRefreshing: boolean;
  lastUpdated: Date;
  onNotificationClick: () => void;
  onRefreshClick: () => void;
}

const CollapsibleHeader: React.FC<CollapsibleHeaderProps> = ({
  activeVehicles,
  totalAlerts,
  pendingAlerts,
  activeTrips,
  maintenanceTasks,
  isRefreshing,
  lastUpdated,
  onNotificationClick,
  onRefreshClick
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  // Check if device is mobile on mount and window resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint is 768px
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Only enable collapsing behavior on mobile devices
    if (!isMobile) {
      setIsCollapsed(false);
      return;
    }

    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          
          // Collapse when scrolling down past 100px, expand when scrolling up
          if (currentScrollY > 100) {
            if (currentScrollY > lastScrollY.current) {
              // Scrolling down
              setIsCollapsed(true);
            } else if (currentScrollY < lastScrollY.current - 5) {
              // Scrolling up (with 5px threshold to prevent jitter)
              setIsCollapsed(false);
            }
          } else {
            // Always expanded at the top
            setIsCollapsed(false);
          }
          
          setScrollY(currentScrollY);
          lastScrollY.current = currentScrollY;
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

  const getTimeSinceUpdate = () => {
    const minutesAgo = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 60000);
    if (minutesAgo < 1) return 'just now';
    if (minutesAgo === 1) return '1 minute ago';
    if (minutesAgo < 60) return `${minutesAgo} minutes ago`;
    const hoursAgo = Math.floor(minutesAgo / 60);
    if (hoursAgo === 1) return '1 hour ago';
    if (hoursAgo < 24) return `${hoursAgo} hours ago`;
    const daysAgo = Math.floor(hoursAgo / 24);
    return daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`;
  };

  const getConnectionStatus = () => {
    const minutesAgo = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 60000);
    if (minutesAgo < 2) return 'bg-green-400 shadow-lg shadow-green-400/50';
    if (minutesAgo < 5) return 'bg-yellow-400 shadow-lg shadow-yellow-400/50';
    return 'bg-red-400 shadow-lg shadow-red-400/50';
  };

  return (
    <div 
      className={`
        sticky top-0 z-30 transition-all duration-300 ease-in-out
        ${isCollapsed && isMobile ? '-translate-y-20 sm:-translate-y-16' : 'translate-y-0'}
      `}
      style={{
        transform: isCollapsed && isMobile
          ? `translateY(-${Math.min(scrollY * 0.5, 80)}px)` 
          : 'translateY(0)'
      }}
    >
      <div className="relative bg-gradient-to-r from-teal-600 via-teal-500 to-green-500 rounded-xl shadow-sm overflow-hidden">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}/>
        </div>

        {/* Compact Header Content */}
        <div className={`
          relative z-10 px-3 sm:px-4 transition-all duration-300
          ${isCollapsed && isMobile ? 'py-2' : 'py-3 sm:py-4'}
        `}>
          <div className="flex items-center justify-between gap-2">
            {/* Left Section - Title */}
            <div className="flex items-center gap-2 min-w-0">
              {/* Icon - Hidden when collapsed on mobile */}
              <div className={`
                relative transition-all duration-300
                ${isCollapsed && isMobile ? 'hidden sm:block scale-75' : 'block'}
              `}>
                <div className="absolute inset-0 bg-white/20 rounded-xl blur-lg animate-pulse"></div>
                <div className="relative p-1.5 sm:p-2 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 shadow-md">
                  <Home className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
              </div>

              {/* Title - Simplified when collapsed */}
              <div className="min-w-0 flex-1">
                <h1 className={`
                  font-bold text-white tracking-tight flex items-center gap-2 transition-all duration-300
                  ${isCollapsed && isMobile ? 'text-sm sm:text-base' : 'text-base sm:text-lg md:text-xl'}
                `}>
                  <span className="truncate">Fleet Activity</span>
                  {/* Live Indicator - Smaller when collapsed */}
                  <span className={`
                    inline-flex items-center gap-1 bg-green-400/20 backdrop-blur-sm rounded-full border border-green-400/30 transition-all duration-300
                    ${isCollapsed && isMobile ? 'px-1 py-0.5' : 'px-1.5 sm:px-2 py-0.5'}
                  `}>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                    </span>
                    <span className={`
                      font-medium text-green-50 transition-all duration-300
                      ${isCollapsed && isMobile ? 'text-[9px] sm:text-[10px]' : 'text-[10px] sm:text-xs'}
                    `}>LIVE</span>
                  </span>
                </h1>
                {/* Subtitle - Hidden when collapsed */}
                {!(isCollapsed && isMobile) && (
                  <p className="text-white/80 text-xs sm:text-sm mt-0.5 truncate">
                    Monitor your fleet performance in real-time
                  </p>
                )}
              </div>
            </div>

            {/* Right Section - Actions */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {/* Quick Stats - Visible when collapsed */}
              {isCollapsed && isMobile && (
                <div className="hidden sm:flex items-center gap-3 mr-2">
                  <div className="text-white/90">
                    <span className="text-xs font-medium">Vehicles:</span>
                    <span className="ml-1 text-sm font-bold">{activeVehicles}</span>
                  </div>
                  <div className="text-white/90">
                    <span className="text-xs font-medium">Alerts:</span>
                    <span className="ml-1 text-sm font-bold">{totalAlerts}</span>
                  </div>
                </div>
              )}

              {/* Notification Bell */}
              <button
                onClick={onNotificationClick}
                className={`
                  relative bg-white/20 backdrop-blur-sm rounded-lg border border-white/30 
                  hover:bg-white/30 active:scale-95 transition-all group
                  ${isCollapsed && isMobile ? 'p-1.5' : 'p-1.5 sm:p-2'}
                `}
                title={`View ${pendingAlerts} pending alerts`}
              >
                <Bell className={`
                  text-white group-hover:scale-110 transition-transform
                  ${isCollapsed && isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'}
                `} />
                {pendingAlerts > 0 && (
                  <span className={`
                    absolute flex items-center justify-center rounded-full bg-red-500 
                    font-bold text-white animate-pulse transition-all duration-300
                    ${isCollapsed && isMobile
                      ? '-top-0.5 -right-0.5 h-3.5 w-3.5 text-[8px]' 
                      : '-top-0.5 -right-0.5 h-4 w-4 text-[9px]'
                    }
                  `}>
                    {pendingAlerts > 9 ? '9+' : pendingAlerts}
                  </span>
                )}
              </button>

              {/* Refresh Button */}
              <button
                onClick={onRefreshClick}
                disabled={isRefreshing}
                className={`
                  bg-white/20 backdrop-blur-sm rounded-lg border border-white/30 
                  hover:bg-white/30 transition-all group
                  ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}
                  ${isCollapsed && isMobile ? 'p-1.5' : 'p-1.5 sm:p-2'}
                `}
                title="Refresh feed"
              >
                <RefreshCw className={`
                  text-white transition-transform duration-500
                  ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'}
                  ${isCollapsed && isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'}
                `} />
              </button>
            </div>
          </div>

          {/* Stats Grid - Hidden when collapsed */}
          {!(isCollapsed && isMobile) && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-2 md:gap-3 mt-2 sm:mt-3">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 border border-white/20">
                  <div className="text-white/70 text-[9px] xs:text-[10px] sm:text-xs truncate">Active Vehicles</div>
                  <div className="text-base sm:text-lg md:text-xl font-bold text-white">{activeVehicles}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 border border-white/20">
                  <div className="text-white/70 text-[9px] xs:text-[10px] sm:text-xs truncate">Total Alerts</div>
                  <div className="text-base sm:text-lg md:text-xl font-bold text-white">{totalAlerts}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 border border-white/20">
                  <div className="text-white/70 text-[9px] xs:text-[10px] sm:text-xs truncate">Active Trips</div>
                  <div className="text-base sm:text-lg md:text-xl font-bold text-white">{activeTrips}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 border border-white/20">
                  <div className="text-white/70 text-[9px] xs:text-[10px] sm:text-xs truncate">Maintenance</div>
                  <div className="text-base sm:text-lg md:text-xl font-bold text-white">{maintenanceTasks}</div>
                </div>
              </div>

              {/* Connection Status */}
              <div className="mt-2 flex items-center justify-center gap-2 text-white/70 text-xs">
                <div className={`w-2 h-2 rounded-full ${getConnectionStatus()}`}></div>
                <span>Last updated: {getTimeSinceUpdate()}</span>
              </div>
            </>
          )}
        </div>

        {/* Collapsed Indicator Bar - Shows at bottom when collapsed */}
        {isCollapsed && isMobile && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20">
            <div className="h-full bg-white/40 animate-pulse" style={{ width: '100%' }}></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollapsibleHeader;
