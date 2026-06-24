import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';

export function OfflineBanner({ message = 'Offline — showing cached data' }: { message?: string }) {
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>⚠️ {message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: Colors.brand.gold,
    alignItems: 'center'
  },
  text: {
    color: Colors.brand.ink,
    fontWeight: '800',
    fontSize: 13
  }
});
