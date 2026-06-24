import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { storage } from '@/lib/storage';
import { apiRequest } from '@/lib/api-config';
import { isRemotePushSupported } from '@/lib/push-capabilities';

const PUSH_TOKEN_KEY = 'expo_push_token';

type NotificationsModule = typeof import('expo-notifications');

let notificationsModule: NotificationsModule | null = null;
let handlerConfigured = false;

async function getNotifications(): Promise<NotificationsModule | null> {
  if (!isRemotePushSupported()) {
    return null;
  }
  if (!notificationsModule) {
    notificationsModule = await import('expo-notifications');
  }
  if (!handlerConfigured && notificationsModule) {
    notificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true
      })
    });
    handlerConfigured = true;
  }
  return notificationsModule;
}

export async function registerForPushNotifications(token?: string) {
  const Notifications = await getNotifications();
  if (!Notifications) {
    return { granted: false, pushToken: null as string | null, unsupported: true as const };
  }

  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.granted ? existing : await Notifications.requestPermissionsAsync();

  if (!permission.granted) {
    return { granted: false, pushToken: null as string | null, unsupported: false as const };
  }

  const projectId = Constants.expoConfig?.extra?.easProjectId as string | undefined;
  const pushToken = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );

  await storage.setString(PUSH_TOKEN_KEY, pushToken.data);

  await apiRequest('/api/push/register', {
    method: 'POST',
    token,
    body: {
      token: pushToken.data,
      platform: Platform.OS === 'ios' ? 'ios' : 'android'
    }
  });

  return { granted: true, pushToken: pushToken.data, unsupported: false as const };
}

export async function unregisterPushNotifications(token?: string) {
  const pushToken = await storage.getString(PUSH_TOKEN_KEY);
  await apiRequest('/api/push/unregister', {
    method: 'POST',
    token,
    body: pushToken ? { token: pushToken } : {}
  });
  await storage.remove(PUSH_TOKEN_KEY);
}

export async function getNotificationPermissionStatus() {
  const Notifications = await getNotifications();
  if (!Notifications) {
    return false;
  }
  const status = await Notifications.getPermissionsAsync();
  return status.granted;
}

export async function getNotificationsModule() {
  return getNotifications();
}
