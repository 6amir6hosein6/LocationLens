import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessaging, isWebPushConfigured, VAPID_KEY } from '../firebase';
import api from '../services/api';

/**
 * Registers this browser tab/PWA for web push (Firebase Cloud Messaging).
 * No-op inside the native Android app (which uses @capacitor/push-notifications instead)
 * and no-op until VITE_FIREBASE_* env vars are set. On iOS, only works for a site added
 * to the home screen - Safari doesn't support push in a regular browser tab at all.
 */
export default function useWebPushNotifications() {
  useEffect(() => {
    if (Capacitor.isNativePlatform() || !isWebPushConfigured) return;
    if (typeof Notification === 'undefined') return;

    let unsubscribe;

    const setup = async () => {
      const messaging = await getFirebaseMessaging();
      if (!messaging) return;

      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      if (permission !== 'granted') return;

      try {
        const registration = await navigator.serviceWorker.ready;
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration,
        });
        if (token) {
          await api.post('/push/register', { token, platform: 'web' });
        }

        // Fires while a tab has focus - background delivery is handled in sw.js instead.
        unsubscribe = onMessage(messaging, (payload) => {
          registration.showNotification(payload.notification?.title || 'لوک‌لنز', {
            body: payload.notification?.body || '',
            icon: '/icons/icon-192.png',
          });
        });
      } catch (err) {
        console.error('Web push registration failed', err);
      }
    };

    setup();

    return () => {
      unsubscribe?.();
    };
  }, []);
}
