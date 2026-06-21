import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export function ErrorAlert({ message }: { message: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.alert, { borderColor: colors.danger }]}>
      <Text style={{ color: colors.danger, fontWeight: '700' }}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  alert: { borderWidth: 1, borderRadius: 8, padding: 12 }
});
