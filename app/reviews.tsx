import { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { listingsApi } from '@/lib/api-config';
import { useTheme } from '@/hooks/useTheme';

interface StudentReview {
  id: number;
  listing_title?: string;
  rating?: number;
  comment?: string;
  created_at?: string;
}

export default function ReviewsScreen() {
  const { colors } = useTheme();
  const { accessToken } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['studentReviews'],
    queryFn: async () => {
      if (!accessToken) {
        throw new Error('Sign in required');
      }
      const response = await listingsApi.getStudentDashboard(accessToken);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message ?? 'Could not load reviews');
      }
      return (response.data as any).reviews ?? [];
    },
    enabled: Boolean(accessToken)
  });

  const reviews = useMemo(() => (data as StudentReview[] | undefined) ?? [], [data]);

  if (isLoading) {
    return <LoadingOverlay />;
  }

  if (!accessToken || isError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}> 
        <Text style={[styles.title, { color: colors.text }]}>My Reviews</Text>
        <EmptyState title="Unable to load reviews" message="Please sign in to see your reviews." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <Stack.Screen options={{ title: 'My Reviews' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>My Reviews</Text>
        {reviews.length === 0 ? (
          <EmptyState title="No reviews yet" message="Leave a review on a property to see it here." />
        ) : (
          reviews.map((review) => (
            <View key={review.id} style={[styles.reviewCard, { borderColor: colors.border, backgroundColor: colors.surface }]}> 
              <Text style={[styles.reviewTitle, { color: colors.text }]}>{review.listing_title ?? 'Listing review'}</Text>
              <Text style={[styles.reviewMeta, { color: colors.subtext }]}>{review.rating ?? 0} ★</Text>
              {review.comment ? <Text style={[styles.reviewComment, { color: colors.text }]}>{review.comment}</Text> : null}
              {review.created_at ? <Text style={[styles.reviewDate, { color: colors.subtext }]}>{new Date(review.created_at).toLocaleDateString()}</Text> : null}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 24 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 12 },
  reviewCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 8
  },
  reviewTitle: { fontSize: 16, fontWeight: '700' },
  reviewMeta: { fontSize: 14 },
  reviewComment: { fontSize: 15, lineHeight: 22 },
  reviewDate: { fontSize: 12, marginTop: 8 }
});
