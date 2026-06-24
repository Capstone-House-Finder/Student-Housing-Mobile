import { useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTheme } from '@/hooks/useTheme';

export interface FilterValues {
  location: string;
  minPrice: string;
  maxPrice: string;
  propertyTypes: string[];
  bedrooms: string;
}

interface FilterSheetProps {
  initialValues: FilterValues;
  onApply: (filters: FilterValues) => void;
}

const PROPERTY_TYPES = ['apartment', 'studio', 'room', 'house'];
const BEDROOM_OPTIONS = ['any', '1', '2', '3', '4+'];

export function FilterSheet({ initialValues, onApply }: FilterSheetProps) {
  const { colors } = useTheme();
  const [location, setLocation] = useState(initialValues.location);
  const [minPrice, setMinPrice] = useState(initialValues.minPrice);
  const [maxPrice, setMaxPrice] = useState(initialValues.maxPrice);
  const [propertyTypes, setPropertyTypes] = useState<string[]>(initialValues.propertyTypes);
  const [bedrooms, setBedrooms] = useState(initialValues.bedrooms);

  const handleApply = () => {
    onApply({
      location,
      minPrice: minPrice,
      maxPrice: maxPrice,
      propertyTypes,
      bedrooms
    });
  };

  const handleReset = () => {
    setLocation('');
    setMinPrice('');
    setMaxPrice('');
    setPropertyTypes([]);
    setBedrooms('any');
  };

  const togglePropertyType = (type: string) => {
    if (propertyTypes.includes(type)) {
      setPropertyTypes(propertyTypes.filter(t => t !== type));
    } else {
      setPropertyTypes([...propertyTypes, type]);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Filters</Text>
        <Pressable onPress={handleReset}>
          <Text style={[styles.resetBtn, { color: colors.subtext }]}>Reset All</Text>
        </Pressable>
      </View>

      <Input
        label="Location / Campus"
        value={location}
        onChangeText={setLocation}
        placeholder="Enter city or campus"
      />

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Price Range (FCFA)</Text>
        <View style={styles.priceRow}>
          <View style={styles.halfInput}>
            <Input
              label="Min Price"
              value={minPrice}
              onChangeText={setMinPrice}
              keyboardType="number-pad"
              placeholder="0"
            />
          </View>
          <View style={styles.halfInput}>
            <Input
              label="Max Price"
              value={maxPrice}
              onChangeText={setMaxPrice}
              keyboardType="number-pad"
              placeholder="500000"
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Property Type</Text>
        <View style={styles.chipRow}>
          {PROPERTY_TYPES.map((type) => {
            const isSelected = propertyTypes.includes(type);
            return (
              <Pressable
                key={type}
                onPress={() => togglePropertyType(type)}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: isSelected ? colors.text : colors.surface,
                    borderColor: colors.border
                  },
                  pressed && { opacity: 0.8 }
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: isSelected ? colors.background : colors.text }
                  ]}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Bedrooms</Text>
        <View style={styles.chipRow}>
          {BEDROOM_OPTIONS.map((bed) => {
            const isSelected = bedrooms === bed;
            return (
              <Pressable
                key={bed}
                onPress={() => setBedrooms(bed)}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: isSelected ? colors.text : colors.surface,
                    borderColor: colors.border
                  },
                  pressed && { opacity: 0.8 }
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: isSelected ? colors.background : colors.text }
                  ]}
                >
                  {bed === 'any' ? 'Any' : bed}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.actionRow}>
        <Button title="Clear" variant="secondary" onPress={handleReset} style={styles.actionBtn} />
        <Button title="Apply" onPress={handleApply} style={styles.actionBtn} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { gap: 18, paddingBottom: 24, paddingHorizontal: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800' },
  resetBtn: { fontSize: 14, fontWeight: '600' },
  section: { gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  priceRow: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  actionBtn: { flex: 1 }
});
