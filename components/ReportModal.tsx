import { useState } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { reportsApi } from '@/lib/api-config';
import { useAuth } from '@/contexts/AuthContext';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { enqueueMutation } from '@/lib/offline-queue';
import { useTheme } from '@/hooks/useTheme';

const REASONS = ['Misleading information', 'Fraudulent listing', 'Inappropriate content', 'Already rented', 'Other'];

export function ReportModal({
  targetId,
  targetType = 'listing',
  onSent
}: {
  targetId: number;
  targetType?: string;
  onSent?: () => void;
}) {
  const { accessToken } = useAuth();
  const { isOffline } = useOfflineSync();
  const { colors } = useTheme();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!accessToken || !reason) return;
    const fullReason = description.trim() ? `${reason}: ${description.trim()}` : reason;
    setLoading(true);

    if (isOffline) {
      await enqueueMutation({ type: 'report', targetId, targetType, reason: fullReason });
      Toast.show({ type: 'info', text1: 'Queued', text2: 'Report will submit when back online.' });
      setLoading(false);
      onSent?.();
      return;
    }

    const response = await reportsApi.submit(accessToken, {
      target_id: targetId,
      target_type: targetType,
      reason: fullReason
    });
    setLoading(false);
    if (response.success) {
      Toast.show({ type: 'success', text1: 'Report submitted', text2: 'Thank you for your report.' });
      onSent?.();
    } else {
      Toast.show({ type: 'error', text1: response.error?.message ?? 'Report failed' });
    }
  };

  return (
    <View style={{ gap: 12, paddingHorizontal: 4 }}>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>Select a reason *</Text>
      <View style={styles.chipRow}>
        {REASONS.map((r) => {
          const isSelected = reason === r;
          return (
            <Pressable
              key={r}
              onPress={() => setReason(r)}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? colors.text : colors.surface,
                  borderColor: colors.border
                }
              ]}
            >
              <Text style={{ color: isSelected ? colors.background : colors.text, fontSize: 13, fontWeight: '600' }}>
                {r}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Input label="Additional details (optional)" value={description} onChangeText={setDescription} multiline placeholder="Any extra information..." />
      <Button title="Submit report" loading={loading} onPress={submit} disabled={!reason} />
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1 }
});
