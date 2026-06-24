import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export function hapticMedium() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch((error) => {
    console.warn('Haptic medium failed:', error);
  });
}

export function hapticSelection() {
  if (Platform.OS === 'web') return;
  Haptics.selectionAsync().catch((error) => {
    console.warn('Haptic selection failed:', error);
  });
}

export function hapticError() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch((error) => {
    console.warn('Haptic error failed:', error);
  });
}
