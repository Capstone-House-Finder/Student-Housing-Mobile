import { ActivityIndicator, Pressable, Text, View, type PressableProps, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { hapticMedium } from '@/lib/haptics';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';

interface ButtonProps extends PressableProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Button({ title, variant = 'primary', loading, disabled, onPress, style, leftIcon, rightIcon, ...props }: ButtonProps) {
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
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <View style={styles.inner}>
            {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
            <Text style={styles.text}>{title}</Text>
            {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderRadius: Layout.radius.md, overflow: 'hidden' },
  gradient: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontWeight: '700', fontSize: 16 },
  iconLeft: { marginRight: 6 },
  iconRight: { marginLeft: 6 },
  pressed: { opacity: 0.86 },
  disabled: { opacity: 0.55 }
});
