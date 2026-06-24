import { StyleSheet, Text, View } from 'react-native';
import { StarRating } from '@/components/StarRating';
import { useTheme } from '@/hooks/useTheme';
import type { Review } from '@/lib/api-config';

export function ReviewItem({ review }: { review: Review }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.item, { borderColor: colors.border }]}>
      <StarRating rating={review.rating} size={18} />
      <Text style={[styles.meta, { color: colors.subtext }]}>{review.student_email ?? 'Student'}</Text>
      {review.comment ? <Text style={{ color: colors.text }}>{review.comment}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({ item: { borderBottomWidth: 1, paddingVertical: 12, gap: 6 }, meta: { fontSize: 12 } });
