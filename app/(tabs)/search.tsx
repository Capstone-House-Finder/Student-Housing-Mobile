import { useRef, useState, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import GorhomBottomSheet from '@gorhom/bottom-sheet';
import { EmptyState } from '@/components/EmptyState';
import { ErrorAlert } from '@/components/ErrorAlert';
import { PropertyCard } from '@/components/PropertyCard';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FilterSheet, type FilterValues } from '@/components/FilterSheet';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useAuth } from '@/contexts/AuthContext';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useTheme } from '@/hooks/useTheme';
import { listingsApi, type Listing } from '@/lib/api-config';

export default function SearchScreen() {
  const { accessToken } = useAuth();
  const { colors } = useTheme();
  const { isOffline } = useOfflineSync();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<FilterValues>({
    location: '',
    minPrice: '',
    maxPrice: '',
    propertyTypes: [],
    bedrooms: 'any'
  });
  
  const [results, setResults] = useState<Listing[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');

  const sheetRef = useRef<GorhomBottomSheet>(null);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.location) count++;
    if (filters.minPrice) count++;
    if (filters.maxPrice) count++;
    if (filters.propertyTypes.length > 0) count++;
    if (filters.bedrooms !== 'any') count++;
    return count;
  }, [filters]);

  const handleApplyFilters = (newFilters: FilterValues) => {
    setFilters(newFilters);
    sheetRef.current?.close();
  };

  const fetchResults = async (pageNum: number, isRefresh = false) => {
    if (!accessToken) {
      setHasSearched(true);
      setResults([]);
      setError('Please sign in to search listings.');
      return;
    }

    if (pageNum === 1) {
      if (isRefresh) setIsRefreshing(true);
      else setIsSearching(true);
    } else {
      setIsLoadingMore(true);
    }
    
    setError('');

    const params: Record<string, string | number> = { page: pageNum, limit: 10 };
    const searchTerm = query.trim();
    const location = filters.location.trim();

    if (location) params.location = location;
    else if (searchTerm) params.location = searchTerm;
    
    if (filters.minPrice) params.minPrice = Number(filters.minPrice);
    if (filters.maxPrice) params.maxPrice = Number(filters.maxPrice);
    // Don't filter by status to allow viewing all listings including rented ones
    // params.status = 'available';
    if (filters.propertyTypes.length > 0) params.property_type = filters.propertyTypes.join(',');
    if (filters.bedrooms !== 'any') {
      params.bedrooms = filters.bedrooms === '4+' ? 4 : Number(filters.bedrooms);
    }

    const response = await listingsApi.search(accessToken, params);

    if (response.success) {
      const newListings = response.data ?? [];
      if (pageNum === 1) {
        setResults(newListings);
        setHasSearched(true);
      } else {
        setResults(prev => [...prev, ...newListings]);
      }
      setHasMore(newListings.length === 10); // Assuming 10 is the page limit
      setPage(pageNum);
    } else {
      if (pageNum === 1) setResults([]);
      setError(response.error?.message ?? 'Unable to search listings');
    }

    setIsSearching(false);
    setIsRefreshing(false);
    setIsLoadingMore(false);
  };

  const handleSearch = () => {
    fetchResults(1);
  };

  const handleRefresh = () => {
    if (hasSearched) {
      fetchResults(1, true);
    }
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && !isSearching && hasMore && hasSearched) {
      fetchResults(page + 1);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isOffline && <OfflineBanner />}
      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Search Listings</Text>
            <View style={styles.searchBarRow}>
              <View style={styles.searchInputContainer}>
                <Input
                  label="City, campus, or title"
                  value={query}
                  onChangeText={setQuery}
                  onSubmitEditing={handleSearch}
                />
              </View>
              <Pressable
                onPress={() => sheetRef.current?.expand()}
                style={({ pressed }) => [
                  styles.filterToggle,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  pressed && { opacity: 0.8 }
                ]}
              >
                <Text style={[styles.filterToggleIcon, { color: colors.text }]}>Filter</Text>
                {activeFilterCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{activeFilterCount}</Text>
                  </View>
                )}
              </Pressable>
            </View>
            <Button title="Search" loading={isSearching} onPress={handleSearch} />
            {error ? <ErrorAlert message={error} /> : null}
          </View>
        }
        ListEmptyComponent={
          hasSearched && !isSearching
            ? <EmptyState title="No matching homes found" />
            : <EmptyState title="Enter your search details" message="Results will load after you press Search." />
        }
        renderItem={({ item }) => <PropertyCard listing={item} />}
        contentContainerStyle={styles.content}
        ListFooterComponent={
          isLoadingMore ? <Text style={{ textAlign: 'center', marginVertical: 10 }}>Loading more...</Text> : null
        }
      />

      <BottomSheet ref={sheetRef} snapPoints={['75%']}>
        <FilterSheet initialValues={filters} onApply={handleApplyFilters} />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 18, paddingBottom: 60 },
  header: { gap: 14, marginBottom: 14 },
  title: { fontSize: 28, fontWeight: '900' },
  searchBarRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  searchInputContainer: { flex: 1 },
  filterToggle: {
    height: 58,
    minWidth: 72,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    flexDirection: 'row',
    gap: 6
  },
  filterToggleIcon: { fontSize: 13, fontWeight: '800' },
  badge: {
    backgroundColor: '#E63946',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4
  },
  badgeText: { color: 'white', fontSize: 11, fontWeight: '900' }
});
