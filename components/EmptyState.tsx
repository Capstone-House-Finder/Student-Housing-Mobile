import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export function EmptyState({ title, message }: { title: string; message?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {message ? <Text style={[styles.message, { color: colors.subtext }]}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  title: { fontSize: 18, fontWeight: '800' },
  message: { fontSize: 14, textAlign: 'center' }
});
