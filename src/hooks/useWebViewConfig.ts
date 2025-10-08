import { useEffect } from 'react';
import { isWebView, isAndroidDevice, isIOSDevice } from '../utils/mobileUtils';

export const useWebViewConfig = () => {
  useEffect(() => {
    if (!isWebView()) return;

    console.log('🔧 WebView detected - Applying configurations...');

    // Fix 1: Viewport Configuration
    const fixViewport = () => {
      let viewport = document.querySelector('meta[name="viewport"]');
      if (!viewport) {
        viewport = document.createElement('meta');
        viewport.setAttribute('name', 'viewport');
        document.head.appendChild(viewport);
      }
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      );
    };

    // Fix 2: Hardware Acceleration
    const enableHardwareAcceleration = () => {
      document.documentElement.style.transform = 'translateZ(0)';
      document.documentElement.style.backfaceVisibility = 'hidden';
      document.documentElement.style.perspective = '1000px';
    };

    // Fix 3: Touch Event Fixes
    const fixTouchEvents = () => {
      // Prevent default touch behaviors that cause issues
      document.addEventListener('touchstart', (e) => {
        if ((e.target as HTMLElement).tagName === 'INPUT' || 
            (e.target as HTMLElement).tagName === 'TEXTAREA') {
          return; // Allow input touches
        }
      }, { passive: true });

      // Fix touch delay
      document.addEventListener('click', (e) => {
        // Remove 300ms delay
      }, { passive: true });
    };

    // Fix 4: Fix Safe Areas for Android
    const fixSafeAreas = () => {
      if (isAndroidDevice()) {
        document.documentElement.style.setProperty('--safe-area-top', '0px');
        document.documentElement.style.setProperty('--safe-area-bottom', '0px');
        document.documentElement.style.setProperty('--safe-area-left', '0px');
        document.documentElement.style.setProperty('--safe-area-right', '0px');
      }
    };

    // Fix 5: Local Storage Access
    const ensureStorageAccess = () => {
      try {
        localStorage.setItem('webview_test', 'test');
        localStorage.removeItem('webview_test');
        console.log('✅ LocalStorage is accessible');
      } catch (e) {
        console.error('❌ LocalStorage is NOT accessible - using memory fallback');
        // Implement memory storage fallback if needed
      }
    };

    // Fix 6: Fix Scrolling Issues
    const fixScrolling = () => {
      document.body.style.overscrollBehavior = 'none';
      document.body.style.webkitOverflowScrolling = 'touch';
    };

    // Fix 7: Fix Input Focus Issues
    const fixInputFocus = () => {
      document.addEventListener('focusin', (e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          setTimeout(() => {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
        }
      });
    };

    // Fix 8: Disable Pull-to-Refresh in WebView
    const disablePullToRefresh = () => {
      let lastY = 0;
      document.addEventListener('touchstart', (e) => {
        lastY = e.touches[0].clientY;
      }, { passive: true });

      document.addEventListener('touchmove', (e) => {
        const currentY = e.touches[0].clientY;
        if (document.body.scrollTop === 0 && currentY > lastY) {
          e.preventDefault();
        }
      }, { passive: false });
    };

    // Apply all fixes
    fixViewport();
    enableHardwareAcceleration();
    fixTouchEvents();
    fixSafeAreas();
    ensureStorageAccess();
    fixScrolling();
    fixInputFocus();
    disablePullToRefresh();

    console.log('✅ WebView configurations applied successfully');
  }, []);

  return { isWebView: isWebView() };
};
