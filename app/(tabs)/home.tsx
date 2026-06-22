import { useEffect, useRef, useMemo } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View, Image, Dimensions, Pressable, RefreshControl } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { EmptyState } from '@/components/EmptyState';
import { ErrorAlert } from '@/components/ErrorAlert';
import { ListingSkeleton } from '@/components/ListingSkeleton';
import { OfflineBanner } from '@/components/OfflineBanner';
import { PropertyCard } from '@/components/PropertyCard';
import { useAuth } from '@/contexts/AuthContext';
import { useListings } from '@/hooks/useListings';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useTheme } from '@/hooks/useTheme';

const { width } = Dimensions.get('window');

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=600&q=80'
];

const FEATURE_CARDS = [
  { id: 'verified', label: 'Verified Listings', icon: '✅' },
  { id: 'campus', label: 'Near Campus', icon: '🎓' },
  { id: 'whatsapp', label: 'WhatsApp Contact', icon: '💬' },
  { id: 'reviews', label: 'Student Reviews', icon: '⭐' }
];

function HeroCarousel() {
  const scrollRef = useRef<ScrollView>(null);
  const indexRef = useRef(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    const interval = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % HERO_IMAGES.length;
      const nextX = indexRef.current * width;
      progress.value = withTiming(nextX, { duration: 600 });
      scrollRef.current?.scrollTo({ x: nextX, animated: true });
    }, 4000);
    return () => clearInterval(interval);
  }, [progress]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      pagingEnabled
      scrollEnabled={false}
      showsHorizontalScrollIndicator={false}
      style={styles.heroScroll}
    >
      {HERO_IMAGES.map((uri, idx) => (
        <View key={idx} style={styles.heroSlide}>
          <Image source={{ uri }} style={styles.heroImage} />
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>Premium Student Living</Text>
            <Text style={styles.heroSubtitle}>Find properties verified for comfort and closeness to campus</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

export default function HomeScreen() {
  const { user, accessToken } = useAuth();
  const { colors } = useTheme();
  const { isOffline } = useOfflineSync();
  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useListings(accessToken, user?.role);

  const listings = useMemo(() => data?.pages.flat() ?? [], [data]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <HeroCarousel />

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Features</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
        {FEATURE_CARDS.map((card) => (
          <Pressable
            key={card.id}
            style={({ pressed }) => [
              styles.categoryCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { opacity: 0.8 }
            ]}
          >
            <Text style={styles.categoryIcon}>{card.icon}</Text>
            <Text style={[styles.categoryLabel, { color: colors.text }]}>{card.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Featured Homes</Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <HeroCarousel />
        <ListingSkeleton count={4} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isOffline && <OfflineBanner />}
      <FlatList
        data={listings}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          error ? (
            <ErrorAlert message={(error as Error).message} />
          ) : (
            <EmptyState title="No listings yet" message="Fresh homes will appear here as landlords publish them." />
          )
        }
        renderItem={({ item }) => <PropertyCard listing={item} />}
        contentContainerStyle={styles.content}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? <Text style={{ textAlign: 'center', marginVertical: 12, color: colors.subtext }}>Loading more...</Text> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 24 },
  headerContainer: { gap: 18, marginBottom: 16 },
  heroScroll: { height: 210, width },
  heroSlide: { width, height: 210, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(37, 27, 61, 0.65)',
    padding: 20,
    justifyContent: 'center'
  },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '900' },
  heroSubtitle: { color: 'rgba(255, 255, 255, 0.9)', fontSize: 13, marginTop: 4 },
  sectionHeader: { paddingHorizontal: 18, marginTop: 12 },
  sectionTitle: { fontSize: 22, fontWeight: '800' },
  categoryScroll: { paddingHorizontal: 18, gap: 12 },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8
  },
  categoryIcon: { fontSize: 18 },
  categoryLabel: { fontSize: 14, fontWeight: '700' }
});
