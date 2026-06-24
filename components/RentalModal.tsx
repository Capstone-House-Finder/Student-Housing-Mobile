import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';

interface RentalModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { studentEmail: string; startDate: string; endDate?: string }) => void;
  loading?: boolean;
}

export function RentalModal({ visible, onClose, onSubmit, loading }: RentalModalProps) {
  const { colors } = useTheme();
  const [studentEmail, setStudentEmail] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSubmit = () => {
    if (!studentEmail.trim() || !startDate.trim()) {
      return;
    }
    onSubmit({
      studentEmail: studentEmail.trim(),
      startDate: startDate.trim(),
      endDate: endDate.trim() || undefined
    });
  };

  const handleClose = () => {
    setStudentEmail('');
    setStartDate('');
    setEndDate('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={[styles.content, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, { color: colors.text }]}>Create Rental Record</Text>
          
          <Input
            label="Student Email *"
            placeholder="student@example.com"
            value={studentEmail}
            onChangeText={setStudentEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Start Date *"
            placeholder="YYYY-MM-DD"
            value={startDate}
            onChangeText={setStartDate}
            keyboardType="numbers-and-punctuation"
          />

          <Input
            label="End Date (Optional)"
            placeholder="YYYY-MM-DD"
            value={endDate}
            onChangeText={setEndDate}
            keyboardType="numbers-and-punctuation"
          />

          <View style={styles.buttons}>
            <Button title="Cancel" variant="secondary" onPress={handleClose} style={styles.button} />
            <Button title="Create Rental" onPress={handleSubmit} loading={loading} style={styles.button} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  content: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    gap: 16
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8
  },
  button: {
    flex: 1
  }
});
