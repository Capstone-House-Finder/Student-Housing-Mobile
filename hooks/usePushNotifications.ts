import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { useAuth } from '@/contexts/AuthContext';
import { isRemotePushSupported } from '@/lib/push-capabilities';
import { getNotificationsModule, registerForPushNotifications } from '@/services/notifications';

function navigateFromNotification(data: Record<string, unknown> | undefined) {
  if (!data) return;

  if (data.screen === 'landlord/dashboard') {
    router.push('/(tabs)/dashboard');
    return;
  }

  const listingId = data.listingId ?? data.listing_id;
  if (listingId) {
    router.push(`/listing/${listingId}`);
  }
}

export function usePushNotifications() {
  const { user, accessToken } = useAuth();
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!isRemotePushSupported() || !user || !accessToken || registeredRef.current) return;
    registeredRef.current = true;
    registerForPushNotifications(accessToken).catch(() => undefined);
  }, [accessToken, user]);

  useEffect(() => {
    if (!isRemotePushSupported()) return;

    let receivedSub: { remove: () => void } | undefined;
    let responseSub: { remove: () => void } | undefined;
    let cancelled = false;

    (async () => {
      const Notifications = await getNotificationsModule();
      if (!Notifications || cancelled) return;

      receivedSub = Notifications.addNotificationReceivedListener((notification) => {
        const title = notification.request.content.title ?? 'Notification';
        const body = notification.request.content.body ?? '';
        Toast.show({ type: 'info', text1: title, text2: body });
      });

      responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as Record<string, unknown> | undefined;
        navigateFromNotification(data);
      });

      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      if (lastResponse && !cancelled) {
        const data = lastResponse.notification.request.content.data as Record<string, unknown> | undefined;
        navigateFromNotification(data);
      }
    })();

    return () => {
      cancelled = true;
      receivedSub?.remove();
      responseSub?.remove();
    };
  }, []);
}
