import { Image, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';

export function Avatar({ name, uri, size = 44 }: { name?: string; uri?: string; size?: number }) {
  const initials = (name ?? 'User').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.initials}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: Colors.brand.violet, alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#fff', fontWeight: '800' }
});
