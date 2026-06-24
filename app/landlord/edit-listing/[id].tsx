import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View, Image, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { listingSchema, type ListingFormData, listingsApi, type Listing } from '@/lib/api-config';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { uploadMultipleImages } from '@/services/cloudinary';

const AMENITIES_LIST = ['Wifi', 'Water', 'Electricity', 'Furnished', 'Air Conditioning', 'Security', 'Laundry'];
const PROPERTY_TYPES = ['apartment', 'studio', 'room', 'house', 'condo', 'townhouse'];

export default function EditListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuth();
  const { colors } = useTheme();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loadingListing, setLoadingListing] = useState(true);
  const [existingPhotos, setExistingPhotos] = useState<{url:string, public_id?:string}[]>([]);
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { control, handleSubmit, setValue, reset, formState: { errors } } = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      price: 0,
      property_type: 'apartment',
      bedrooms: 1,
      bathrooms: 1,
      square_meters: 0,
      amenities: []
    }
  });

  useEffect(() => {
    let active = true;
    const fetchListing = async () => {
      if (!accessToken || !id) return;
      setLoadingListing(true);
      try {
        const response = await listingsApi.getById(accessToken, Number(id));
        if (active && response.success && response.data) {
          const data = response.data as Listing;
          setListing(data);
          setExistingPhotos(data.photos?.map(p => ({ url: p.url, public_id: p.public_id })) ?? []);
          reset({
            title: data.title ?? '',
            description: data.description ?? '',
            location: data.location ?? '',
            price: data.price ?? 0,
            property_type: (data as any).property_type ?? 'apartment',
            bedrooms: data.bedrooms ?? 1,
            bathrooms: (data as any).bathrooms ?? 1,
            square_meters: (data as any).square_meters ?? 0,
            amenities: data.amenities?.map((a: any) => typeof a === 'string' ? a : a.name) ?? []
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoadingListing(false);
      }
    };
    fetchListing();
    return () => { active = false; };
  }, [accessToken, id, reset]);

  const handlePickPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo library access in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ['images'],
      quality: 0.8,
      selectionLimit: 8
    });
    if (!result.canceled && result.assets.length > 0) {
      setNewPhotos(result.assets.map(a => a.uri));
    }
  };

  const onSubmit = async (data: ListingFormData) => {
    if (!accessToken || !id) return;
    setSaving(true);

    try {
      let photos = existingPhotos;

      if (newPhotos.length > 0) {
        const uploaded = await uploadMultipleImages(newPhotos, id, accessToken);
        photos = [...photos, ...uploaded];
      }

      const payload = { ...data, photos };
      const response = await listingsApi.update(accessToken, Number(id), payload as any);

      if (response.success) {
        Alert.alert('✅ Saved!', 'Listing updated successfully.', [
          { text: 'Go to Dashboard', onPress: () => router.replace('/(tabs)/dashboard') }
        ]);
      } else {
        Alert.alert('Error', response.error?.message ?? 'Unable to save changes.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'An error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Listing',
      'Are you sure? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!accessToken || !id) return;
            setDeleting(true);
            const response = await listingsApi.delete(accessToken, Number(id));
            setDeleting(false);
            if (response.success) {
              Alert.alert('Deleted', 'Listing has been removed.', [
                { text: 'OK', onPress: () => router.replace('/(tabs)/dashboard') }
              ]);
            } else {
              Alert.alert('Error', response.error?.message ?? 'Unable to delete listing.');
            }
          }
        }
      ]
    );
  };

  const selectedType = useWatch({ control, name: 'property_type' });

  if (loadingListing) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

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
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Edit Listing</Text>
        <Badge status={listing.status ?? 'available'} />
      </View>

      <Card style={styles.card}>
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Basic Info</Text>

        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Title" value={value} onBlur={onBlur} onChangeText={onChange} error={errors.title?.message} />
          )}
        />
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Description" value={value} onBlur={onBlur} onChangeText={onChange} multiline numberOfLines={4} error={errors.description?.message} />
          )}
        />
        <Controller
          control={control}
          name="location"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Location" value={value} onBlur={onBlur} onChangeText={onChange} error={errors.location?.message} />
          )}
        />
        <Controller
          control={control}
          name="price"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Monthly Rent (FCFA)"
              value={value ? String(value) : ''}
              onBlur={onBlur}
              onChangeText={(t) => onChange(Number(t.replace(/[^0-9]/g, '')))}
              keyboardType="numeric"
              error={errors.price?.message}
            />
          )}
        />

        <Text style={[styles.fieldLabel, { color: colors.text }]}>Property Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {PROPERTY_TYPES.map((type) => (
            <Pressable
              key={type}
              onPress={() => setValue('property_type', type as any)}
              style={[
                styles.chip,
                { backgroundColor: selectedType === type ? colors.text : colors.surface, borderColor: colors.border }
              ]}
            >
              <Text style={[styles.chipText, { color: selectedType === type ? colors.background : colors.text }]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Details</Text>
        <View style={styles.inlineRow}>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="bedrooms"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input label="Bedrooms" value={value !== undefined ? String(value) : ''} onBlur={onBlur} onChangeText={(t) => onChange(Number(t || 0))} keyboardType="numeric" error={errors.bedrooms?.message} />
              )}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="bathrooms"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input label="Bathrooms" value={value !== undefined ? String(value) : ''} onBlur={onBlur} onChangeText={(t) => onChange(Number(t || 0))} keyboardType="numeric" error={errors.bathrooms?.message} />
              )}
            />
          </View>
        </View>
        <Controller
          control={control}
          name="square_meters"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Area (sq meters)" value={value !== undefined ? String(value) : ''} onBlur={onBlur} onChangeText={(t) => onChange(Number(t || 0))} keyboardType="numeric" error={errors.square_meters?.message} />
          )}
        />

        <Text style={[styles.fieldLabel, { color: colors.text }]}>Amenities</Text>
        <Controller
          control={control}
          name="amenities"
          render={({ field: { onChange, value = [] } }) => (
            <View style={styles.amenitiesGrid}>
              {AMENITIES_LIST.map((item) => {
                const isSelected = value.includes(item);
                return (
                  <Pressable
                    key={item}
                    onPress={() => onChange(isSelected ? value.filter((a) => a !== item) : [...value, item])}
                    style={[
                      styles.chip,
                      { backgroundColor: isSelected ? colors.text : colors.surface, borderColor: colors.border, margin: 4 }
                    ]}
                  >
                    <Text style={[styles.chipText, { color: isSelected ? colors.background : colors.text }]}>
                      {isSelected ? '✓ ' : ''}{item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Photos</Text>

        {existingPhotos.length > 0 && (
          <>
            <Text style={[styles.fieldLabel, { color: colors.subtext }]}>Current photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
              {existingPhotos.map((photo, idx) => (
                  <View key={photo.url} style={styles.photoWrapper}>
                    <Image source={{ uri: photo.url }} style={styles.photo} />
                    <Pressable
                      style={styles.photoRemoveBtn}
                      onPress={() => setExistingPhotos(prev => prev.filter((_, i) => i !== idx))}
                    >
                      <Text style={styles.photoRemoveText}>✕</Text>
                    </Pressable>
                  </View>
                ))}
            </ScrollView>
          </>
        )}

        <Button
          title={newPhotos.length > 0 ? `New photos: ${newPhotos.length} selected` : 'Add New Photos'}
          variant="secondary"
          onPress={handlePickPhotos}
        />
        {newPhotos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
            {newPhotos.map((uri, idx) => (
              <View key={uri} style={styles.photoWrapper}>
                <Image source={{ uri }} style={[styles.photo, { borderColor: '#4CAF50', borderWidth: 2 }]} />
                <Pressable
                  style={styles.photoRemoveBtn}
                  onPress={() => setNewPhotos(prev => prev.filter((_, i) => i !== idx))}
                >
                  <Text style={styles.photoRemoveText}>✕</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}
      </Card>

      <Button
        title="Save Changes"
        loading={saving}
        onPress={handleSubmit(onSubmit)}
        style={styles.saveBtn}
      />

      <Button
        title={deleting ? 'Deleting...' : 'Delete Listing'}
        variant="danger"
        loading={deleting}
        onPress={handleDelete}
        style={styles.deleteBtn}
      />
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 18, gap: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '900' },
  card: { padding: 16, gap: 12 },
  sectionLabel: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  fieldLabel: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  chipRow: { gap: 8, paddingBottom: 4 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  inlineRow: { flexDirection: 'row', gap: 12 },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  photoRow: { gap: 10, paddingVertical: 8 },
  photoWrapper: { position: 'relative' },
  photo: { width: 80, height: 80, borderRadius: 8 },
  photoRemoveBtn: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: '#E63946', borderRadius: 10,
    width: 20, height: 20, alignItems: 'center', justifyContent: 'center'
  },
  photoRemoveText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  saveBtn: { marginTop: 8 },
  deleteBtn: { marginBottom: 8 }
});
