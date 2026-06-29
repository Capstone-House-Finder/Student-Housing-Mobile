import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';

interface RentalModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { studentEmail: string; startDate: string; endDate?: string }) => void;
  loading?: boolean;
}

/** Format a Date to YYYY-MM-DD */
const toISO = (d?: Date | null) => d instanceof Date ? d.toISOString().split('T')[0] : '';

/** Simple email validation */
const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// ---------------------------------------------------------------------------
// Reusable date-picker field
// ---------------------------------------------------------------------------
interface DateFieldProps {
  label: string;
  required?: boolean;
  value: Date | null;
  onChange: (date: Date) => void;
  minimumDate?: Date;
}

function DateField({ label, required, value, onChange, minimumDate }: DateFieldProps) {
  const { colors } = useTheme();
  const [show, setShow] = useState(false);

  const handleValueChange = (event: any, selected?: Date) => {
    if (selected) onChange(selected);
    if (Platform.OS === 'android') setShow(false);
  };

  const handleDismiss = () => {
    setShow(false);
  };

  return (
    <View style={fieldStyles.wrapper}>
      <Text style={[fieldStyles.label, { color: colors.text }]}>
        {label}{required ? ' *' : ''}
      </Text>

      {/* Tap target that opens the picker */}
      <Pressable
        onPress={() => setShow(true)}
        style={({ pressed }) => [
          fieldStyles.row,
          { backgroundColor: colors.background, borderColor: colors.border },
          pressed && { opacity: 0.75 },
        ]}
      >
        <Text style={[fieldStyles.value, { color: value ? colors.text : colors.subtext }]}>
          {value ? toISO(value) : 'Tap to select date'}
        </Text>
        <Text style={{ fontSize: 16 }}>📅</Text>
      </Pressable>

      {/* Picker — Android shows inline dialog; iOS shows spinner */}
      {show && (
        <DateTimePicker
          value={value || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={minimumDate || undefined}
          onChange={handleValueChange}
        />
      )}

      {/* iOS needs explicit "Done" since spinner doesn't auto-dismiss */}
      {show && Platform.OS === 'ios' && (
        <View style={fieldStyles.iosBtnRow}>
          <Pressable onPress={() => setShow(false)}>
            <Text style={[fieldStyles.iosBtn, { color: colors.subtext }]}>Cancel</Text>
          </Pressable>
          <Pressable onPress={() => setShow(false)}>
            <Text style={[fieldStyles.iosBtn, { color: colors.text }]}>Done</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontSize: 13, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  value: { fontSize: 15, fontWeight: '500' },
  iosBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  iosBtn: { fontSize: 14, fontWeight: '700', paddingVertical: 4, paddingHorizontal: 8 },
});

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------
export function RentalModal({ visible, onClose, onSubmit, loading }: RentalModalProps) {
  const { colors } = useTheme();
  const [studentEmail, setStudentEmail] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const isValid = studentEmail.trim().length > 0 && isValidEmail(studentEmail) && startDate !== null;

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit({
      studentEmail: studentEmail.trim(),
      startDate: toISO(startDate!),
      endDate: endDate ? toISO(endDate) : undefined,
    });
  };

  const handleClose = () => {
    setStudentEmail('');
    setStartDate(null);
    setEndDate(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: colors.text }]}>Create Rental Record</Text>

          {/* Student email */}
          <View style={{ gap: 6 }}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Student Email *</Text>
            <TextInput
              style={[
                styles.emailInput,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
              placeholder="student@example.com"
              placeholderTextColor={colors.subtext}
              value={studentEmail}
              onChangeText={setStudentEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <DateField
            label="Start Date"
            required
            value={startDate}
            onChange={setStartDate}
            minimumDate={new Date()}
          />

          <DateField
            label="End Date (Optional)"
            value={endDate}
            onChange={setEndDate}
            minimumDate={startDate ?? new Date()}
          />

          <View style={styles.btnRow}>
            <Button title="Cancel" variant="secondary" onPress={handleClose} style={styles.btn} />
            <Button
              title="Create Rental"
              onPress={handleSubmit}
              loading={loading}
              disabled={!isValid}
              style={styles.btn}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 24,
    gap: 18,
  },
  title: { fontSize: 20, fontWeight: '800' },
  fieldLabel: { fontSize: 13, fontWeight: '700' },
  emailInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '500',
  },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  btn: { flex: 1 },
});
