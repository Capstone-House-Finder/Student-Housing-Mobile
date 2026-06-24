import { Pressable, StyleSheet, Text, View } from 'react-native';
import { hapticSelection } from '@/lib/haptics';
import { Colors } from '@/constants/colors';

export function StarRating({ rating, onChange, size = 24 }: { rating: number; onChange?: (rating: number) => void; size?: number }) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Pressable
          key={value}
          disabled={!onChange}
          onPress={() => {
            hapticSelection();
            onChange?.(value);
          }}
        >
          <Text style={{ fontSize: size, color: value <= rating ? Colors.brand.gold : '#d1d5db' }}>★</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 2 } });
