import { StyleSheet, Text } from 'react-native';
import { Colors } from '@/constants/colors';

const variants = {
  available: { backgroundColor: 'rgba(0,184,148,0.14)', color: Colors.brand.teal },
  rented: { backgroundColor: 'rgba(220,38,38,0.14)', color: '#dc2626' },
  under_negotiation: { backgroundColor: 'rgba(255,209,102,0.26)', color: '#9a6500' }
};

export function Badge({ status }: { status: keyof typeof variants | string }) {
  const variant = variants[status as keyof typeof variants] ?? variants.available;
  return <Text style={[styles.badge, variant]}>{status.replace(/_/g, ' ')}</Text>;
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, overflow: 'hidden', fontSize: 12, fontWeight: '700', textTransform: 'capitalize' }
});
