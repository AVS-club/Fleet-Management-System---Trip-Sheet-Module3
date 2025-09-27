// Service Worker registration and management utilities

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('Service Worker registered successfully:', registration);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content is available, show update notification
            showUpdateNotification();
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
};

export const unregisterServiceWorker = async (): Promise<void> => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(registration => registration.unregister()));
    console.log('Service Worker unregistered');
  } catch (error) {
    console.error('Service Worker unregistration failed:', error);
  }
};

export const checkForUpdates = async (): Promise<void> => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
    }
  } catch (error) {
    console.error('Failed to check for updates:', error);
  }
};

export const skipWaiting = (): void => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  navigator.serviceWorker.ready.then(registration => {
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  });
};

export const showUpdateNotification = (): void => {
  // Create a custom update notification
  const notification = document.createElement('div');
  notification.className = 'fixed top-4 right-4 bg-blue-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm';
  notification.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="flex-shrink-0">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
        </svg>
      </div>
      <div class="flex-1">
        <h3 class="text-sm font-medium">Update Available</h3>
        <p class="text-sm opacity-90 mt-1">A new version of Auto Vital is available.</p>
        <div class="mt-3 flex gap-2">
          <button id="update-btn" class="bg-white text-blue-500 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100">
            Update Now
          </button>
          <button id="dismiss-btn" class="text-white opacity-75 px-3 py-1 text-sm hover:opacity-100">
            Later
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(notification);

  // Add event listeners
  const updateBtn = notification.querySelector('#update-btn');
  const dismissBtn = notification.querySelector('#dismiss-btn');

  updateBtn?.addEventListener('click', () => {
    skipWaiting();
    notification.remove();
    window.location.reload();
  });

  dismissBtn?.addEventListener('click', () => {
    notification.remove();
  });

  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.remove();
    }
  }, 10000);
};

export const getServiceWorkerVersion = (): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!('serviceWorker' in navigator)) {
      resolve(null);
      return;
    }

    const messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data.version || null);
    };

    navigator.serviceWorker.ready.then(registration => {
      if (registration.active) {
        registration.active.postMessage({ type: 'GET_VERSION' }, [messageChannel.port2]);
      } else {
        resolve(null);
      }
    }).catch(() => {
      resolve(null);
    });
  });
};

export const isServiceWorkerSupported = (): boolean => {
  return 'serviceWorker' in navigator;
};

export const getServiceWorkerState = async (): Promise<string | null> => {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      if (registration.installing) return 'installing';
      if (registration.waiting) return 'waiting';
      if (registration.active) return 'active';
    }
    return null;
  } catch (error) {
    console.error('Failed to get service worker state:', error);
    return null;
  }
};

// Initialize service worker on app start
export const initializeServiceWorker = async (): Promise<void> => {
  if (!isServiceWorkerSupported()) {
    console.log('Service Worker not supported in this browser');
    return;
  }

  try {
    await registerServiceWorker();
    
    // Check for updates every 30 minutes
    setInterval(checkForUpdates, 30 * 60 * 1000);
    
    console.log('Service Worker initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Service Worker:', error);
  }
};

// Handle service worker messages
export const handleServiceWorkerMessages = (): void => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  navigator.serviceWorker.addEventListener('message', (event) => {
    const { data } = event;
    
    switch (data.type) {
      case 'CACHE_UPDATED':
        console.log('Cache updated:', data.cacheName);
        break;
      case 'OFFLINE_DATA_SYNCED':
        console.log('Offline data synced:', data.count);
        break;
      case 'NOTIFICATION_CLICKED':
        console.log('Notification clicked:', data.action);
        break;
      default:
        console.log('Unknown service worker message:', data);
    }
  });
};

// Cache management utilities
export const clearServiceWorkerCache = async (): Promise<void> => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('Service Worker cache cleared');
  } catch (error) {
    console.error('Failed to clear service worker cache:', error);
  }
};

export const getCacheSize = async (): Promise<number> => {
  if (!('serviceWorker' in navigator)) {
    return 0;
  }

  try {
    const cacheNames = await caches.keys();
    let totalSize = 0;

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
    }

    return totalSize;
  } catch (error) {
    console.error('Failed to calculate cache size:', error);
    return 0;
  }
};

export default {
  registerServiceWorker,
  unregisterServiceWorker,
  checkForUpdates,
  skipWaiting,
  showUpdateNotification,
  getServiceWorkerVersion,
  isServiceWorkerSupported,
  getServiceWorkerState,
  initializeServiceWorker,
  handleServiceWorkerMessages,
  clearServiceWorkerCache,
  getCacheSize
};
