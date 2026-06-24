import { useState, useRef } from 'react';
import { Alert, StyleSheet, Text, View, ScrollView, Image, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import PagerView from 'react-native-pager-view';
import { listingSchema, type ListingFormData, type Listing, listingsApi } from '@/lib/api-config';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { uploadMultipleImages } from '@/services/cloudinary';

const AMENITIES_LIST = ['Wifi', 'Water', 'Electricity', 'Furnished', 'Air Conditioning', 'Security', 'Laundry'];
const PROPERTY_TYPES = ['apartment', 'studio', 'room', 'house', 'condo', 'townhouse'];
const TOTAL_STEPS = 4;
const STEP_LABELS = ['Details', 'Features', 'Photos', 'Review'];

export default function CreateListingScreen() {
  const { accessToken } = useAuth();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const pagerRef = useRef<any>(null);

  const { control, handleSubmit, trigger, getValues, setValue, formState: { errors } } = useForm<ListingFormData>({
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

  const goToPage = (page: number) => {
    setCurrentPage(page);
    pagerRef.current?.setPage(page);
  };

  const handleNext = async () => {
    if (currentPage === 0) {
      const isValid = await trigger(['title', 'description', 'location', 'price', 'property_type']);
      if (!isValid) return;
    }
    goToPage(Math.min(currentPage + 1, TOTAL_STEPS - 1));
  };

  const handleBack = () => {
    goToPage(Math.max(currentPage - 1, 0));
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library in Settings.');
      return;
    }
    const remaining = 8 - selectedPhotos.length;
    if (remaining <= 0) {
      Alert.alert('Limit reached', 'You can upload a maximum of 8 photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ['images'],
      quality: 0.8,
      selectionLimit: remaining
    });
    if (!result.canceled && result.assets.length > 0) {
      // Append to existing selection rather than replacing
      setSelectedPhotos(prev => [...prev, ...result.assets.map(a => a.uri)].slice(0, 8));
    }
  };

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow camera access in Settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setSelectedPhotos((prev) => [...prev, result.assets[0].uri].slice(0, 8));
    }
  };

  const handlePickPhotos = () => {
    if (Platform.OS === 'web') {
      // Camera not available on web — go straight to gallery
      pickFromGallery();
      return;
    }
    Alert.alert('Add Photos', 'Choose a source', [
      { text: 'Camera', onPress: pickFromCamera },
      { text: 'Gallery', onPress: pickFromGallery },
      { text: 'Cancel', style: 'cancel' }
    ]);
  };

  const handleRemovePhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
  };

const onSubmit = async (data: ListingFormData) => {
  if (!accessToken) return;
  setSubmitting(true);

  try {
    // First create the listing without photos
    const createPayload = { ...data, photos: [] };
    const createResponse = await listingsApi.create(accessToken, createPayload as any);

    if (!createResponse.success) {
      Alert.alert('Unable to publish', createResponse.error?.message ?? 'Please try again.');
      return;
    }

    // Extract the new listing ID with proper type casting
    const listing = createResponse.data as Listing;
    const listingId = listing.id?.toString();

    // If there are photos, upload them using the newly created listing ID
    if (selectedPhotos.length > 0 && listingId) {
      setUploadingPhotos(true);
      await uploadMultipleImages(selectedPhotos, listingId, accessToken);
      setUploadingPhotos(false);
    }

    // Optionally, you could update the listing with the photo URLs here if the backend supports it.
    // For now we consider the listing published.
    queryClient.invalidateQueries({ queryKey: ['listings'] });
    Alert.alert('🎉 Listing Published!', 'Your property is now live for students to discover.', [
      { text: 'Go to Dashboard', onPress: () => router.replace('/(tabs)/dashboard') }
    ]);
  } catch (err: any) {
    Alert.alert('Error', err.message ?? 'An unexpected error occurred');
  } finally {
    setSubmitting(false);
    setUploadingPhotos(false);
  }
};

  const selectedType = useWatch({ control, name: 'property_type' });

  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Step Progress Indicator */}
      <View style={[styles.progressBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {STEP_LABELS.map((label, idx) => (
          <Pressable
            key={label}
            style={styles.stepItem}
            onPress={() => idx < currentPage && goToPage(idx)}
          >
            <View style={[
              styles.stepCircle,
              { backgroundColor: idx <= currentPage ? colors.text : colors.surface, borderColor: colors.border }
            ]}>
              <Text style={[styles.stepNum, { color: idx <= currentPage ? colors.background : colors.subtext }]}>
                {idx + 1}
              </Text>
            </View>
            <Text style={[styles.stepLabel, { color: idx === currentPage ? colors.text : colors.subtext }]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.text }]}>Create Listing</Text>

        <PagerView
          ref={pagerRef}
          style={styles.pager}
          initialPage={0}
          scrollEnabled={false}
          onPageSelected={(e: any) => setCurrentPage(e.nativeEvent.position)}
        >
          {/* Step 1: Basic Details */}
          <View key="details" style={styles.page}>
            <Controller
              control={control}
              name="title"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input label="Listing Title" value={value} onBlur={onBlur} onChangeText={onChange} placeholder="e.g. Cozy studio near university" error={errors.title?.message} />
              )}
            />
            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input label="Description" value={value} onBlur={onBlur} onChangeText={onChange} multiline numberOfLines={4} placeholder="Describe the property..." error={errors.description?.message} />
              )}
            />
            <Controller
              control={control}
              name="location"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input label="Location / Neighborhood" value={value} onBlur={onBlur} onChangeText={onChange} placeholder="e.g. Bastos, Yaoundé" error={errors.location?.message} />
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
                  onChangeText={(text) => onChange(Number(text.replace(/[^0-9]/g, '')))}
                  keyboardType="numeric"
                  placeholder="e.g. 75000"
                  error={errors.price?.message}
                />
              )}
            />

            <View>
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
            </View>

            <Button title="Next: Features →" onPress={handleNext} style={styles.btn} />
          </View>

          {/* Step 2: Features */}
          <View key="features" style={styles.page}>
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

            <View style={styles.btnRow}>
              <Button title="← Back" variant="secondary" onPress={handleBack} style={styles.halfBtn} />
              <Button title="Next: Photos →" onPress={handleNext} style={styles.halfBtn} />
            </View>
          </View>

          {/* Step 3: Photos */}
          <View key="photos" style={styles.page}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Property Photos</Text>
            <Text style={{ color: colors.subtext, marginBottom: 12 }}>
              Add up to 8 photos. Great photos get more inquiries!
            </Text>

            <Button
              title={
                selectedPhotos.length === 0
                  ? '📷  Add Photos'
                  : selectedPhotos.length >= 8
                  ? '8/8 photos (max)'
                  : `📷  Add More Photos (${selectedPhotos.length}/8)`
              }
              variant="secondary"
              onPress={handlePickPhotos}
              disabled={selectedPhotos.length >= 8}
            />

            {selectedPhotos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoPreviewRow}>
                {selectedPhotos.map((uri, idx) => (
                  <View key={uri} style={styles.photoPreviewWrapper}>
                    <Image source={{ uri }} style={styles.photoPreview} />
                    <Pressable style={styles.photoRemoveBtn} onPress={() => handleRemovePhoto(idx)}>
                      <Text style={styles.photoRemoveText}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.btnRow}>
              <Button title="← Back" variant="secondary" onPress={handleBack} style={styles.halfBtn} />
              <Button title="Review →" onPress={handleNext} style={styles.halfBtn} />
            </View>
          </View>

          {/* Step 4: Review & Submit */}
          <View key="review" style={styles.page}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Review & Publish</Text>
            <Card style={styles.reviewCard}>
              <Text style={[styles.reviewTitle, { color: colors.text }]}>{getValues('title')}</Text>
              <Text style={{ color: colors.subtext, marginTop: 4 }}>📍 {getValues('location')}</Text>
              <Text style={[styles.reviewPrice, { color: colors.text }]}>
                {Number(getValues('price')).toLocaleString()} FCFA/mo
              </Text>
              <View style={styles.reviewMeta}>
                <Text style={{ color: colors.subtext }}>🛏 {getValues('bedrooms')} bed</Text>
                <Text style={{ color: colors.subtext }}>🚿 {getValues('bathrooms')} bath</Text>
                <Text style={{ color: colors.subtext }}>🏠 {getValues('property_type')}</Text>
              </View>
              <Text style={{ color: colors.subtext, marginTop: 8, lineHeight: 18 }} numberOfLines={4}>
                {getValues('description')}
              </Text>
              {selectedPhotos.length > 0 && (
                <Text style={{ color: colors.subtext, marginTop: 6 }}>📷 {selectedPhotos.length} photo(s) will be uploaded</Text>
              )}
            </Card>

            {(submitting || uploadingPhotos) && (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={colors.text} />
                <Text style={{ color: colors.subtext, marginTop: 8 }}>
                  {uploadingPhotos ? 'Uploading photos...' : 'Publishing listing...'}
                </Text>
              </View>
            )}

            <View style={styles.btnRow}>
              <Button title="← Back" variant="secondary" onPress={handleBack} style={styles.halfBtn} />
              <Button
                title="🚀 Publish"
                loading={submitting}
                onPress={handleSubmit(onSubmit)}
                style={styles.halfBtn}
              />
            </View>
          </View>
        </PagerView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1
  },
  stepItem: { alignItems: 'center', gap: 4, flex: 1 },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center'
  },
  stepNum: { fontSize: 12, fontWeight: '900' },
  stepLabel: { fontSize: 10, fontWeight: '600' },
  container: { padding: 18, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '900', marginBottom: 16 },
  pager: { height: 580 },
  page: { gap: 12, paddingVertical: 4 },
  btn: { marginTop: 8 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  halfBtn: { flex: 1 },
  fieldLabel: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  chipRow: { gap: 8, paddingBottom: 4 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  inlineRow: { flexDirection: 'row', gap: 12 },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  sectionLabel: { fontSize: 18, fontWeight: '800' },
  photoPreviewRow: { gap: 10, paddingVertical: 8 },
  photoPreviewWrapper: { position: 'relative' },
  photoPreview: { width: 90, height: 90, borderRadius: 10 },
  photoRemoveBtn: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: '#E63946', borderRadius: 12,
    width: 22, height: 22, alignItems: 'center', justifyContent: 'center'
  },
  photoRemoveText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  reviewCard: { padding: 16, gap: 4 },
  reviewTitle: { fontSize: 18, fontWeight: '800' },
  reviewPrice: { fontSize: 20, fontWeight: '900', marginTop: 4 },
  reviewMeta: { flexDirection: 'row', gap: 14, marginTop: 8 },
  loadingBox: { alignItems: 'center', paddingVertical: 12 }
});
