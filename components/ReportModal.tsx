import { useState } from 'react';
import { View } from 'react-native';
import Toast from 'react-native-toast-message';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { reportsApi } from '@/lib/api-config';
import { useAuth } from '@/contexts/AuthContext';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { enqueueMutation } from '@/lib/offline-queue';

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
  const [reason, setReason] = useState(REASONS[0]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!accessToken) return;
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
    if (response.success) onSent?.();
    else Toast.show({ type: 'error', text1: response.error?.message ?? 'Report failed' });
  };

  return (
    <View style={{ gap: 12, paddingHorizontal: 4 }}>
      <Input label="Reason" value={reason} onChangeText={setReason} />
      <Input label="Description" value={description} onChangeText={setDescription} multiline placeholder="Additional details (optional)" />
      <Button title="Submit report" loading={loading} onPress={submit} />
    </View>
  );
}
