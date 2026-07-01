import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import type { Listing } from '@/lib/api-config';
import Animated, { FadeInUp } from 'react-native-reanimated';

export function PropertyCard({ listing }: { listing: Listing }) {
  const { colors } = useTheme();
  const { isAuthenticated } = useAuth();
  const imageUrl = listing.photos?.[0]?.url ?? 'https://placehold.co/600x400?text=Student+Housing';
  const bedrooms = listing.bedrooms ?? 0;
  const rating = (listing as any).rating ?? 0;

  const handlePress = () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Sign in required',
        'Please register or log in to view listing details.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log In', onPress: () => router.push('/(auth)/login') },
          { text: 'Register', onPress: () => router.push('/(auth)/register') }
        ]
      );
      return;
    }
    router.push(`/listing/${listing.id}`);
  };

  return (
    <Animated.View entering={FadeInUp.duration(400)}>
      <Pressable onPress={handlePress}>
        <Card style={styles.card}>
          <Image source={{ uri: imageUrl }} style={styles.image} />
          <View style={styles.body}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{listing.title}</Text>
              {listing.status ? <Badge status={listing.status} /> : null}
            </View>
            <Text style={[styles.location, { color: colors.subtext }]} numberOfLines={1}>{listing.location}</Text>
            
            <View style={styles.metaRow}>
              <Text style={[styles.metaText, { color: colors.subtext }]}>🛏️ {bedrooms} Bed{bedrooms !== 1 ? 's' : ''}</Text>
              {rating > 0 && (
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingText}>★ {rating.toFixed(1)}</Text>
                </View>
              )}
            </View>

            <Text style={[styles.price, { color: colors.text }]}>{listing.price.toLocaleString()} FCFA/mo</Text>
          </View>
        </Card>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 0, marginBottom: 14, overflow: 'hidden' },
  image: { height: 170, width: '100%' },
  body: { padding: 14, gap: 6 },
  header: { gap: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800', flex: 1 },
  location: { fontSize: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  metaText: { fontSize: 14, fontWeight: '500' },
  ratingBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: { fontSize: 12, fontWeight: 'bold', color: '#000' },
  price: { fontSize: 17, fontWeight: '900', marginTop: 4 }
});
