import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import api from '../services/api';

/**
 * Registers this device for FCM push notifications (Android app only - no-op on web).
 * Call once from an authenticated screen so the token is tied to the logged-in user.
 */
export default function usePushNotifications() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listeners = [];

    const setup = async () => {
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }
      if (permStatus.receive !== 'granted') return;

      listeners.push(
        await PushNotifications.addListener('registration', (token) => {
          api.post('/push/register', { token: token.value, platform: 'android' }).catch(() => {});
        })
      );

      listeners.push(
        await PushNotifications.addListener('registrationError', (err) => {
          console.error('Push registration failed', err);
        })
      );

      listeners.push(
        await PushNotifications.addListener('pushNotificationActionPerformed', () => {
          navigate('/');
        })
      );

      await PushNotifications.register();
    };

    setup();

    return () => {
      listeners.forEach((l) => l.remove());
    };
  }, [navigate]);
}
