import { StyleSheet, View, type ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { Layout } from '@/constants/layout';
import { useTheme } from '@/hooks/useTheme';

export function Card({ style, children, ...props }: ViewProps) {
  const { colors, colorScheme } = useTheme();
  return (
    <BlurView intensity={colorScheme === 'dark' ? 28 : 45} tint={colorScheme} style={[styles.card, { borderColor: colors.border }, style]} {...props}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
      <View>{children}</View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: Layout.radius.md, padding: Layout.spacing.lg, overflow: 'hidden', ...Layout.shadow.card }
});
