import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';

function SkeletonBlock({ style }: { style: object }) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[style, { backgroundColor: colors.border }, animatedStyle]}
    />
  );
}

export function ListingSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.card}>
          <SkeletonBlock style={styles.image} />
          <View style={styles.body}>
            <SkeletonBlock style={styles.title} />
            <SkeletonBlock style={styles.line} />
            <SkeletonBlock style={styles.price} />
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14, paddingHorizontal: 18 },
  card: { borderRadius: 12, overflow: 'hidden' },
  image: { height: 170, width: '100%', borderRadius: 12 },
  body: { padding: 14, gap: 8 },
  title: { height: 18, width: '70%', borderRadius: 6 },
  line: { height: 14, width: '50%', borderRadius: 6 },
  price: { height: 16, width: '40%', borderRadius: 6, marginTop: 4 }
});
