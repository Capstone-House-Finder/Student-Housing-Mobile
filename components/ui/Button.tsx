import { ActivityIndicator, Pressable, Text, type PressableProps, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { hapticMedium } from '@/lib/haptics';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';

interface ButtonProps extends PressableProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, variant = 'primary', loading, disabled, onPress, style, ...props }: ButtonProps) {
  const gradient = variant === 'danger'
    ? ['#dc2626', '#ef4444']
    : variant === 'secondary'
      ? [Colors.brand.ink, Colors.brand.violet]
      : [Colors.brand.magenta, Colors.brand.coral];

  return (
    <Pressable
      {...props}
      disabled={disabled || loading}
      onPress={(event) => {
        hapticMedium();
        onPress?.(event);
      }}
      style={({ pressed }) => [styles.wrapper, pressed && styles.pressed, disabled && styles.disabled, style]}
    >
      <LinearGradient colors={gradient as [string, string]} style={styles.gradient}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.text}>{title}</Text>}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderRadius: Layout.radius.md, overflow: 'hidden' },
  gradient: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  text: { color: '#fff', fontWeight: '700', fontSize: 16 },
  pressed: { opacity: 0.86 },
  disabled: { opacity: 0.55 }
});
