// Web push (Firebase Cloud Messaging) for background/closed-tab notifications.
// Config comes via the registration URL's query string (see index.html) since a plain
// static file can't read Vite env vars - stays inert if unconfigured.
const swQuery = new URLSearchParams(self.location.search);
const firebaseApiKey = swQuery.get('apiKey');

if (firebaseApiKey) {
  importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js');

  firebase.initializeApp({
    apiKey: firebaseApiKey,
    authDomain: swQuery.get('authDomain'),
    projectId: swQuery.get('projectId'),
    storageBucket: swQuery.get('storageBucket'),
    messagingSenderId: swQuery.get('messagingSenderId'),
    appId: swQuery.get('appId'),
  });

  const messaging = firebase.messaging();

  // Fires when a push arrives while no tab has focus - foreground delivery is handled
  // separately in useWebPushNotifications.js via onMessage().
  messaging.onBackgroundMessage((payload) => {
    self.registration.showNotification(payload.notification?.title || 'لوک‌لنز', {
      body: payload.notification?.body || '',
      icon: '/icons/icon-192.png',
    });
  });
}

const CACHE_NAME = 'locationlens-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/logo.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Network-first: always prefer the latest deployed build. Only fall back to the
  // cache if the network request fails (i.e. actually offline), so a stale cached
  // page never gets served indefinitely just because a cached copy exists.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
