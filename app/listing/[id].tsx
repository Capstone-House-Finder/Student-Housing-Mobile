import { useLocalSearchParams, Stack } from 'expo-router';
import { useState, useRef } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Share,
  Linking
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import GorhomBottomSheet from '@gorhom/bottom-sheet';
import * as Sharing from 'expo-sharing';
import { ImageCarousel } from '@/components/ImageCarousel';
import { ReviewItem } from '@/components/ReviewItem';
import { StarRating } from '@/components/StarRating';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ReportModal } from '@/components/ReportModal';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useAuth } from '@/contexts/AuthContext';
import { listingsApi, reviewsApi, getValidAccessToken, type Listing, type Review } from '@/lib/api-config';
import { getListingShareUrl } from '@/lib/deep-linking';
import { enqueueMutation } from '@/lib/offline-queue';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useTheme } from '@/hooks/useTheme';
import Toast from 'react-native-toast-message';

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken, user } = useAuth();
  const { colors } = useTheme();
  const { isOffline } = useOfflineSync();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [showAllReviews, setShowAllReviews] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);

  const reportSheetRef = useRef<GorhomBottomSheet>(null);

  const listingId = Number(id);

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', listingId],
    queryFn: async () => {
      const token = await getValidAccessToken(accessToken);
      if (!token) throw new Error('Sign in required');
      const response = await listingsApi.getById(token, listingId);
      if (!response.success) throw new Error(response.error?.message ?? 'Listing not found');
      return response.data as Listing & {
        reviews?: Review[];
        landlord?: { phone?: string; full_name?: string; email?: string };
      };
    },
    enabled: Boolean(accessToken && id && Number.isFinite(listingId)),
    placeholderData: () =>
      queryClient.getQueryData(['listing', listingId]) as Listing | undefined
  });

  const reviews = listing?.reviews ?? [];
  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 3);

  // True when the logged-in landlord is viewing their own listing
  const isOwnListing = !!(user && listing && user.id === listing.landlord_id);



  const handleShare = async () => {
    if (!listing) return;
    const url = getListingShareUrl(listing.id);
    const message = `Check out this student housing property: ${listing.title} for ${listing.price?.toLocaleString()} FCFA/mo!\n${url}`;
    if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) {
      await Share.share({ message, url, title: listing.title });
    } else {
      await Share.share({ message, title: listing.title });
    }
  };

  const handleContactLandlord = async () => {
    const token = await getValidAccessToken(accessToken);
    if (!token || !listing || !listing.id) {
      Toast.show({ type: 'error', text1: 'Unable to contact landlord', text2: 'Please sign in and try again.' });
      return;
    }
    setContactLoading(true);
    if (isOffline) {
      const landlordPhone = listing.landlord?.phone ?? '';
      const cleanPhone = landlordPhone.replace(/\D/g, '');
      if (cleanPhone) {
        const fallbackUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hello, I am interested in your property listing: "${listing.title}" listed for ${listing.price} FCFA/mo.`)}`;
        Linking.openURL(fallbackUrl).catch(() => {
          Alert.alert('Error', 'Could not open WhatsApp. Please make sure WhatsApp is installed.');
        });
        await enqueueMutation({ type: 'contact', listingId: listing.id });
        Toast.show({ type: 'info', text1: 'Queued contact log', text2: 'Inquiry will sync when back online.' });
      } else {
        await enqueueMutation({ type: 'contact', listingId: listing.id });
        Toast.show({ type: 'info', text1: 'Queued', text2: 'Inquiry will send when back online.' });
      }
      setContactLoading(false);
      return;
    }
    const response = await listingsApi.contact(token, listing.id);
    setContactLoading(false);
    if (response.success && response.data) {
      const data = response.data as { whatsappUrl?: string };
      if (data.whatsappUrl) {
        Linking.openURL(data.whatsappUrl).catch(() => {
          Alert.alert('Error', 'Could not open WhatsApp. Please make sure WhatsApp is installed.');
        });
      } else {
        Toast.show({ type: 'success', text1: 'Inquiry sent', text2: 'The landlord has been notified.' });
      }
    } else {
      Toast.show({ type: 'error', text1: response.error?.message ?? 'Failed to send inquiry' });
    }
  };

  const handleSubmitReview = async () => {
    if (!accessToken || !listing || reviewRating < 1) return;
    setSubmittingReview(true);
    if (isOffline) {
      await enqueueMutation({ type: 'review', listingId: listing.id, rating: reviewRating, comment: reviewComment });
      Toast.show({ type: 'info', text1: 'Queued', text2: 'Review will submit when back online.' });
      setSubmittingReview(false);
      return;
    }
    const response = await reviewsApi.create(accessToken, listing.id, {
      rating: reviewRating,
      comment: reviewComment || undefined
    });
    setSubmittingReview(false);
    if (response.success) {
      setReviewRating(0);
      setReviewComment('');
      queryClient.invalidateQueries({ queryKey: ['listing', listingId] });
      Toast.show({ type: 'success', text1: 'Review submitted' });
    } else {
      Toast.show({ type: 'error', text1: response.error?.message ?? 'Failed to submit review' });
    }
  };

  if (isLoading && !listing) return <LoadingOverlay />;

  if (!listing) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Listing not found.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen
        options={{
          headerRight: () => <Button title="Share" variant="secondary" onPress={handleShare} style={{ minHeight: 36 }} />
        }}
      />
      {isOffline && <OfflineBanner />}

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <ImageCarousel photos={listing.photos ?? []} />

        <View style={styles.content}>
          <View style={styles.rowHeader}>
            <Text style={[styles.title, { color: colors.text }]}>{listing.title}</Text>
            {listing.status && <Badge status={listing.status} />}
          </View>

          <Text style={[styles.location, { color: colors.subtext }]}>📍 {listing.location}</Text>
          <Text style={[styles.price, { color: colors.text }]}>
            {listing.price?.toLocaleString()} FCFA <Text style={styles.perMonth}>/ month</Text>
          </Text>

          {listing.landlord && (
            <Card style={styles.descCard}>
              <Text style={[styles.descTitle, { color: colors.text }]}>Landlord</Text>
              <Text style={{ color: colors.text }}>{listing.landlord.full_name ?? 'Landlord'}</Text>
              {listing.landlord.phone && <Text style={{ color: colors.subtext }}>{listing.landlord.phone}</Text>}
            </Card>
          )}

          <Card style={styles.descCard}>
            <Text style={[styles.descTitle, { color: colors.text }]}>Description</Text>
            <Text style={[styles.description, { color: colors.text }]}>{listing.description}</Text>
          </Card>

          {listing.amenities && listing.amenities.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Amenities</Text>
              <View style={styles.amenitiesGrid}>
                {listing.amenities.map((item, idx) => (
                  <View key={idx} style={[styles.amenityBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.amenityText, { color: colors.text }]}>✓ {typeof item === 'string' ? item : item.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Reviews & Ratings</Text>
            {visibleReviews.length > 0 ? (
              visibleReviews.map((review) => <ReviewItem key={review.id} review={review} />)
            ) : (
              <Text style={{ color: colors.subtext, fontStyle: 'italic', marginTop: 4 }}>No reviews yet for this property.</Text>
            )}
            {reviews.length > 3 && (
              <Button
                title={showAllReviews ? 'Show fewer reviews' : `Show all ${reviews.length} reviews`}
                variant="secondary"
                onPress={() => setShowAllReviews((v) => !v)}
              />
            )}

            {user?.role === 'student' && (
              <Card style={{ marginTop: 12, padding: 14, gap: 10 }}>
                <Text style={[styles.descTitle, { color: colors.text }]}>Leave a review</Text>
                <StarRating rating={reviewRating} onChange={setReviewRating} />
                <Input
                  label="Comment (optional)"
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  multiline
                />
                <Button title="Submit Review" loading={submittingReview} onPress={handleSubmitReview} disabled={reviewRating < 1} />
              </Card>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Sticky footer: hidden entirely for the listing owner (no contact / no self-report) */}
      {!isOwnListing && (
        <View style={[styles.stickyFooter, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + 12 }]}>
          <Button
            title={contactLoading ? 'Connecting...' : 'Contact Landlord'}
            loading={contactLoading}
            onPress={handleContactLandlord}
            style={{ flex: 1 }}
          />
          <Button title="Report" variant="danger" onPress={() => reportSheetRef.current?.expand()} />
        </View>
      )}

      <BottomSheet ref={reportSheetRef} snapPoints={['50%']}>
        <ReportModal
          targetId={listing.id}
          onSent={() => {
            reportSheetRef.current?.close();
            Alert.alert('Report submitted', 'Thank you for reporting this listing.');
          }}
        />
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 40 },
  content: { padding: 18, gap: 16 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  title: { fontSize: 24, fontWeight: '900', flex: 1 },
  location: { fontSize: 15, fontWeight: '600' },
  price: { fontSize: 24, fontWeight: '900', marginTop: 4 },
  perMonth: { fontSize: 15, fontWeight: '400' },
  descCard: { padding: 16 },
  descTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  description: { fontSize: 14, lineHeight: 20 },
  section: { marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 10 },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityBadge: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1 },
  amenityText: { fontSize: 13, fontWeight: '600' },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderTopWidth: 1
  }
});
