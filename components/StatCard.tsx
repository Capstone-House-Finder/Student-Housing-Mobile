import { StyleSheet, Text } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';

export function StatCard({ label, value, index = 0 }: { label: string; value: string | number; index?: number }) {
  const { colors } = useTheme();
  return (
    <Animated.View
      entering={FadeInRight.delay(index * 80).duration(400)}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.subtext }]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 140,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 12
  },
  value: { fontSize: 26, fontWeight: '900' },
  label: { fontSize: 12, fontWeight: '600', marginTop: 6 }
});
