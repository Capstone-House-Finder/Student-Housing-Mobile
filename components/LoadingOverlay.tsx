import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Colors } from '@/constants/colors';

export function LoadingOverlay() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.brand.magenta} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' }
});
