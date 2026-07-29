import { initializeApp } from 'firebase/app';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export const isWebPushConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.messagingSenderId && firebaseConfig.appId && VAPID_KEY
);

let messagingPromise = null;

/** Lazily initialize Firebase Messaging. Resolves to null if unconfigured or unsupported
 * (e.g. Safari in a regular tab rather than an installed home-screen PWA). */
export function getFirebaseMessaging() {
  if (!isWebPushConfigured) return Promise.resolve(null);
  if (!messagingPromise) {
    messagingPromise = isSupported().then((supported) => {
      if (!supported) return null;
      const app = initializeApp(firebaseConfig);
      return getMessaging(app);
    });
  }
  return messagingPromise;
}
