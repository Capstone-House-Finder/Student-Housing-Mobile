import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import GorhomBottomSheet from '@gorhom/bottom-sheet';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/StatCard';
import { EmptyState } from '@/components/EmptyState';
import { OfflineBanner } from '@/components/OfflineBanner';
import { RentalModal } from '@/components/RentalModal';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { listingsApi, rentalsApi, getValidAccessToken, type Listing } from '@/lib/api-config';

interface StudentDashboardData {
  stats?: { total_reviews?: number; contact_requests?: number };
  reviews?: { id: number; listing_title?: string; rating?: number; comment?: string; created_at?: string }[];
}

const STATUS_GROUPS = [
  { key: 'available', title: 'Available' },
  { key: 'under_negotiation', title: 'Under Negotiation' },
  { key: 'rented', title: 'Rented' }
] as const;

export default function DashboardScreen() {
  const { user, accessToken } = useAuth();
  const { colors, colorScheme } = useTheme();
  const { isOffline } = useOfflineSync();
  const queryClient = useQueryClient();
  const role = user?.role ?? 'student';

  const actionSheetRef = useRef<GorhomBottomSheet>(null);

  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [landlordStats, setLandlordStats] = useState<Record<string, number>>({});
  const [studentData, setStudentData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [rentalModalVisible, setRentalModalVisible] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [creatingRental, setCreatingRental] = useState(false);

  const fetchLandlordData = useCallback(async () => {
    if (!accessToken) return;
    const response = await listingsApi.getLandlordDashboard(accessToken);
    if (response.success) {
      setMyListings(response.data?.listings ?? []);
      const stats = response.data?.stats as Record<string, number> | undefined;
      if (stats) setLandlordStats(stats);
    }
  }, [accessToken]);

  const fetchStudentData = useCallback(async () => {
    if (!accessToken) return;
    const response = await listingsApi.getStudentDashboard(accessToken);
    if (response.success) {
      setStudentData(response.data as StudentDashboardData);
    }
  }, [accessToken]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (role === 'landlord') await fetchLandlordData();
      else await fetchStudentData();
      if (active) setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [role, fetchLandlordData, fetchStudentData]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (role === 'landlord') await fetchLandlordData();
    else await fetchStudentData();
    setRefreshing(false);
  };

  const openStatusModal = (listing: Listing) => {
    setSelectedListing(listing);
    setStatusModalVisible(true);
  };

  const openActionSheet = (listing: Listing) => {
    setSelectedListing(listing);
    actionSheetRef.current?.expand();
  };

  const handleStatusSelect = async (status: string) => {
    if (!selectedListing || !accessToken) return;
    setStatusModalVisible(false);

    if (status === 'rented') {
      setRentalModalVisible(true);
    } else {
      const response = await listingsApi.updateStatus(accessToken, selectedListing.id, status);
      if (response.success) {
        await fetchLandlordData();
        queryClient.invalidateQueries({ queryKey: ['listings'] });
      }
    }
  };

  const handleRentalSubmit = async (data: { studentEmail: string; startDate: string; endDate?: string }) => {
    if (!selectedListing || !accessToken) return;
    setCreatingRental(true);
    try {
      const token = await getValidAccessToken(accessToken);
      if (!token) {
        setCreatingRental(false);
        return;
      }

      const response = await rentalsApi.create(token, {
        student_email: data.studentEmail,
        listing_id: selectedListing.id,
        start_date: data.startDate,
        end_date: data.endDate
      });

      if (response.success) {
        await fetchLandlordData();
        queryClient.invalidateQueries({ queryKey: ['listings'] });
        setRentalModalVisible(false);
      }
    } catch (error) {
      console.error('Failed to create rental:', error);
    } finally {
      setCreatingRental(false);
    }
  };

  const handleDeleteListing = async (listing: Listing) => {
    if (!accessToken) return;

    const performDelete = async () => {
      try {
        const token = await getValidAccessToken(accessToken);
        if (!token) return;

        const response = await listingsApi.delete(token, listing.id);
        if (response.success) {
          await fetchLandlordData();
          queryClient.invalidateQueries({ queryKey: ['listings'] });
        }
      } catch (error) {
        console.error('Failed to delete listing:', error);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this listing? This action cannot be undone.');
      if (confirmed) {
        await performDelete();
      }
    } else {
      Alert.alert(
        'Delete Listing',
        'Are you sure you want to delete this listing? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: performDelete }
        ]
      );
    }
  };

  const sections = useMemo(() => {
    return STATUS_GROUPS.map((group) => ({
      title: group.title,
      data: myListings.filter((l) => (l.status ?? 'available') === group.key)
    })).filter((s) => s.data.length > 0);
  }, [myListings]);

  const activeCount = myListings.filter((l) => (l.status ?? 'available') === 'available').length;
  const pendingCount = myListings.filter((l) => l.status === 'under_negotiation').length;
  const totalContacts = landlordStats.total_contacts ?? 0;

  const studentActivity = useMemo(() => {
    const items: { id: string; type: string; label: string; date?: string }[] = [];
    studentData?.reviews?.forEach((r) => {
      items.push({
        id: `review-${r.id}`,
        type: 'review',
        label: `Reviewed "${r.listing_title ?? 'a listing'}" — ${r.rating}★`,
        date: r.created_at
      });
    });
    return items;
  }, [studentData]);

  const renderLandlordDashboard = () => (
    <View style={styles.dashboardContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
        <StatCard label="Total Listings" value={myListings.length} index={0} />
        <StatCard label="Active" value={activeCount} index={1} />
        <StatCard label="Pending" value={pendingCount} index={2} />
        <StatCard label="Contacts" value={totalContacts} index={3} />
      </ScrollView>

      <View style={styles.quickActions}>
        <Button title="Create Listing" onPress={() => router.push('/landlord/create-listing')} style={styles.quickBtn} />
        <Button title="View Contacts" variant="secondary" onPress={() => router.push('/contacts')} style={styles.quickBtn} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>My Listings</Text>
      {loading ? (
        <ActivityIndicator color={colors.text} style={{ marginTop: 20 }} />
      ) : sections.length > 0 ? (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          scrollEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={[styles.groupTitle, { color: colors.text }]}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <View style={[styles.listingItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {/* Overflow (three‑dot) menu button */}
              <Pressable
                style={[styles.menuButton, { backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}
                onPress={() => openActionSheet(item)}
              >
                <Text style={[styles.menuDots, { color: colors.text }]}>⋮</Text>
              </Pressable>

              <View style={{ flex: 1 }}>
                <Pressable onPress={() => router.push(`/listing/${item.id}`)}>
                  {item.photos && item.photos.length > 0 && (
                    <Image source={{ uri: item.photos[0].url }} style={styles.listingImage} />
                  )}
                  <Text style={[styles.listingTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
                  <Text style={[styles.listingPrice, { color: colors.subtext }]}>{item.price ? item.price.toLocaleString() : '0'} FCFA/mo</Text>
                  <Text style={[styles.listingLocation, { color: colors.subtext }]} numberOfLines={1}>{item.location || ''}</Text>
                </Pressable>
                <View style={styles.listingActions}>
                  <View style={styles.badgeContainer}>
                    <Badge status={item.status ?? 'available'} />
                  </View>
                </View>
              </View>
            </View>
          )}
        />
      ) : (
        <Text style={{ color: colors.subtext, fontStyle: 'italic' }}>No listings created yet.</Text>
      )}
    </View>
  );

  const renderStudentDashboard = () => (
    <View style={styles.dashboardContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
        <StatCard label="Reviews Written" value={studentData?.stats?.total_reviews ?? 0} index={0} />
        <StatCard label="Contacts Made" value={studentData?.stats?.contact_requests ?? 0} index={1} />
        <StatCard label="Saved" value={0} index={2} />
      </ScrollView>

      <View style={styles.quickActions}>
        <Button title="Browse" onPress={() => router.push('/(tabs)/home')} style={styles.quickBtn} />
        <Button title="Edit Profile" variant="secondary" onPress={() => router.push('/(tabs)/profile')} style={styles.quickBtn} />
        <Button title="My Reviews" variant="secondary" onPress={() => router.push('/reviews' as const)} style={styles.quickBtn} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
      {studentActivity.length > 0 ? (
        studentActivity.map((item) => (
          <View key={item.id} style={[styles.activityItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.activityType, { color: colors.subtext }]}>{item.type.toUpperCase()}</Text>
            <Text style={{ color: colors.text }}>{item.label}</Text>
          </View>
        ))
      ) : (
        <EmptyState title="No activity yet" message="Browse listings, leave reviews, or contact landlords to see your activity here." />
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {isOffline && <OfflineBanner />}
        <Text style={[styles.title, { color: colors.text }]}>Dashboard</Text>
        {role === 'landlord' ? renderLandlordDashboard() : renderStudentDashboard()}

        {/* Status Modal */}
        <Modal
          visible={statusModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setStatusModalVisible(false)}
        >
          <Pressable style={styles.overlay} onPress={() => setStatusModalVisible(false)}>
            <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Status</Text>
              {STATUS_GROUPS.map((group) => (
                <Pressable
                  key={group.key}
                  style={[styles.statusOption, { borderColor: colors.border }]}
                  onPress={() => handleStatusSelect(group.key)}
                >
                  <Text style={[styles.statusOptionText, { color: colors.text }]}>{group.title}</Text>
                </Pressable>
              ))}
            </Pressable>
          </Pressable>
        </Modal>

        {/* Rental Modal */}
        <RentalModal
          visible={rentalModalVisible}
          onClose={() => setRentalModalVisible(false)}
          onSubmit={handleRentalSubmit}
          loading={creatingRental}
        />
      </ScrollView>

      {/* Overflow Options Bottom Sheet */}
      <BottomSheet ref={actionSheetRef} snapPoints={['35%']}>
        <View style={styles.actionSheetContent}>
          <Text style={[styles.actionSheetTitle, { color: colors.text }]}>Manage Listing</Text>
          
          <TouchableOpacity
            style={[styles.actionSheetItem, { borderColor: colors.border }]}
            onPress={() => {
              actionSheetRef.current?.close();
              if (selectedListing) {
                router.push(`/landlord/edit-listing/${selectedListing.id}`);
              }
            }}
          >
            <Text style={[styles.actionSheetItemText, { color: colors.text }]}>Edit Listing</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionSheetItem, { borderColor: colors.border }]}
            onPress={() => {
              actionSheetRef.current?.close();
              if (selectedListing) {
                openStatusModal(selectedListing);
              }
            }}
          >
            <Text style={[styles.actionSheetItemText, { color: colors.text }]}>Change Status</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionSheetItem,
              {
                borderColor: colors.danger,
                backgroundColor: colorScheme === 'dark' ? 'rgba(248, 113, 113, 0.1)' : 'rgba(220, 38, 38, 0.05)'
              }
            ]}
            onPress={() => {
              actionSheetRef.current?.close();
              if (selectedListing) {
                handleDeleteListing(selectedListing);
              }
            }}
          >
            <Text style={[styles.actionSheetItemText, { color: colors.danger }]}>Delete Listing</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </View>
  );
}

// ------------------------------------------------------------
// Styles
// ------------------------------------------------------------
const styles = StyleSheet.create({
  container: { padding: 18, gap: 16, paddingBottom: 40 },
  dashboardContainer: { gap: 16 },
  title: { fontSize: 28, fontWeight: '900', marginBottom: 6 },
  statsScroll: { paddingVertical: 4 },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  quickBtn: { flexGrow: 1, minWidth: '30%' },
  sectionTitle: { fontSize: 20, fontWeight: '800', marginTop: 8 },
  groupTitle: { fontSize: 16, fontWeight: '800', marginTop: 12, marginBottom: 8 },

  listingItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 10,
    position: 'relative',
    overflow: 'visible'
  },
  listingImage: { width: 80, height: 80, borderRadius: 8 },
  listingTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  listingPrice: { fontSize: 14, marginBottom: 2 },
  listingLocation: { fontSize: 12, marginBottom: 8 },
  listingActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },

  badgeContainer: {},

  // Menu button styles
  menuButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 10,
    borderRadius: 22,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  menuDots: {
    fontSize: 22,
    fontWeight: 'bold',
    includeFontPadding: false
  },

  actionSheetContent: {
    gap: 12,
    paddingBottom: 24
  },
  actionSheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8
  },
  actionSheetItem: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48
  },
  actionSheetItemText: {
    fontSize: 16,
    fontWeight: '600'
  },

  activityItem: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 10, gap: 4 },
  activityType: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 300, borderRadius: 16, padding: 20, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },

  statusOption: { padding: 14, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  statusOptionText: { fontSize: 16, fontWeight: '600' },

  // Destructive colors (defined but not used directly here)
  destructiveBackground: { backgroundColor: '#ffebee' },
  destructiveText: { color: '#c62828' }
});