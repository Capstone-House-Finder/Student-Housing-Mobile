import Constants from 'expo-constants';

/**
 * Remote push (Expo push tokens) is unavailable in Expo Go since SDK 53.
 * Use a development build for full push notification testing.
 */
export function isRemotePushSupported(): boolean {
  return Constants.appOwnership !== 'expo';
}
