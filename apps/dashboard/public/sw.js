// sw.js - Service Worker for Luminum Agency notifications + PWA caching

// ====================
// PUSH NOTIFICATION HANDLERS (kept intact)
// ====================

// Listen for push events
self.addEventListener("push", function (event) {
  let data = {};

  try {
    data = event.data.json();
  } catch (e) {
    data = { title: "New notification", body: event.data?.text() || "" };
  }

  const title = data.title || data.organizationName || "Notification";

  // Use the tag from the server (notification id), fallback to timestamp
  const tag = data.tag && data.tag.trim() !== "" ? data.tag : `notif-${Date.now()}`;

  // Enhanced notification options with better Apple/iOS support (plain JS for SW)
  var options = {
    body: data.message || data.body || "You have a new notification",
    icon: data.icon || "/android-chrome-192x192.png",
    badge: data.badge || data.badgeColor || "/android-chrome-192x192.png",
    tag: tag,
    renotify: true,
    requireInteraction: data.requireInteraction || false,
    vibrate: data.vibrate || [200, 100, 200],
    timestamp: data.timestamp || Date.now(),
    sound: data.sound || "default",
    dir: "auto",
    lang: "en"
  };
  options.data = data.data || {};
  if (data.image) options.image = data.image;
  if (data.color) options.color = data.color;
  if (data.actions && Array.isArray(data.actions)) options.actions = data.actions;

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  // Get URL from notification data or top-level url property
  const notificationData = event.notification.data || {};
  const url = notificationData.url || event.notification.url || "/"; // open dashboard root if no URL

  console.log('Notification clicked, navigating to:', url);

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(windowClients => {
      // Try to find an existing window with the same origin
      for (let client of windowClients) {
        if (client.url.startsWith(self.location.origin)) {
          // Focus the existing window and navigate to the notification URL
          return client.focus().then(() => {
            // Send message to client to navigate
            return client.postMessage({
              type: 'NOTIFICATION_CLICK',
              url: url,
              notificationData: notificationData
            }).then(() => {
              // Also navigate directly
              return client.navigate(url).catch(() => {
                // Navigate might not be available in all browsers
                // Fall back to opening new window
                if (clients.openWindow) {
                  return clients.openWindow(url);
                }
              });
            });
          });
        }
      }
      
      // If no existing window, open a new one
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Optional: handle notification close events
self.addEventListener("notificationclose", function(event) {
  // You can send analytics or mark as read here if needed
  // const notificationData = event.notification.data;
  // console.log("Notification closed", notificationData);
});

// ====================
// PWA CACHING (SIMPLIFIED - NO OFFLINE FUNCTIONALITY)
// ====================

const CACHE_NAME = 'luminum-pwa-v1';

// Basic caching for essential files only
const essentialUrlsToCache = [
  '/',
  '/favicon.ico'
];

// Install event - minimal caching
self.addEventListener('install', function(event) {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(essentialUrlsToCache);
      })
  );
  
  // Take control immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all pages
  return self.clients.claim();
});

// Handle service worker updates
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Error handling for unhandled promise rejections
self.addEventListener('unhandledrejection', function(event) {
  console.error('Unhandled promise rejection in service worker:', event.reason);
});

// Global error handler
self.addEventListener('error', function(event) {
  console.error('Service worker error:', event.error);
});