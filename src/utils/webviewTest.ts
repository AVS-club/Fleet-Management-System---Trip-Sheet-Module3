// WebView Detection Test Utility
// This file can be used to test WebView detection in different environments

import { isWebView, getWrapperType, isAndroidDevice, isIOSDevice } from './mobileUtils';

export const testWebViewDetection = () => {
  console.log('🔍 WebView Detection Test Results:');
  console.log('=====================================');
  
  // Basic device detection
  console.log('📱 Device Detection:');
  console.log(`  - Android Device: ${isAndroidDevice()}`);
  console.log(`  - iOS Device: ${isIOSDevice()}`);
  
  // WebView detection
  console.log('🌐 WebView Detection:');
  console.log(`  - Is WebView: ${isWebView()}`);
  console.log(`  - Wrapper Type: ${getWrapperType()}`);
  
  // User Agent info
  console.log('🔍 User Agent Info:');
  console.log(`  - User Agent: ${navigator.userAgent}`);
  
  // Environment detection
  console.log('🏗️ Environment Detection:');
  console.log(`  - Cordova Available: ${!!(window as any).cordova}`);
  console.log(`  - Capacitor Available: ${!!(window as any).Capacitor}`);
  console.log(`  - Window Object: ${typeof window !== 'undefined'}`);
  
  // Storage test
  console.log('💾 Storage Test:');
  try {
    localStorage.setItem('webview_test', 'test');
    localStorage.removeItem('webview_test');
    console.log('  - LocalStorage: ✅ Working');
  } catch (e) {
    console.log('  - LocalStorage: ❌ Not accessible');
  }
  
  console.log('=====================================');
  
  return {
    isWebView: isWebView(),
    wrapperType: getWrapperType(),
    isAndroid: isAndroidDevice(),
    isIOS: isIOSDevice(),
    userAgent: navigator.userAgent,
    cordovaAvailable: !!(window as any).cordova,
    capacitorAvailable: !!(window as any).Capacitor
  };
};

// Auto-run test in development
if (process.env.NODE_ENV === 'development') {
  // Run test after a short delay to ensure everything is loaded
  setTimeout(() => {
    testWebViewDetection();
  }, 1000);
}
