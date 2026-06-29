import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { StarRating } from '@/components/StarRating';
import { useTheme } from '@/hooks/useTheme';
import type { Review } from '@/lib/api-config';

interface ReviewItemProps {
  review: Review & { reply?: { text: string } | null };
  isLandlord?: boolean;
  onReply?: (text: string) => Promise<void>;
}

export function ReviewItem({ review, isLandlord, onReply }: ReviewItemProps) {
  const { colors } = useTheme();
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitReply = async () => {
    if (!replyText.trim() || !onReply) return;
    setSubmitting(true);
    await onReply(replyText.trim());
    setSubmitting(false);
    setShowReplyInput(false);
    setReplyText('');
  };

  return (
    <View style={[styles.item, { borderColor: colors.border }]}>
      <StarRating rating={review.rating} size={18} />
      <Text style={[styles.meta, { color: colors.subtext }]}>{review.student_email ?? 'Student'}</Text>
      {review.comment ? <Text style={{ color: colors.text }}>{review.comment}</Text> : null}

      {/* Landlord reply */}
      {review.reply ? (
        <View style={[styles.replyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.replyLabel, { color: colors.subtext }]}>Landlord reply:</Text>
          <Text style={{ color: colors.text }}>{review.reply.text}</Text>
        </View>
      ) : isLandlord && onReply ? (
        showReplyInput ? (
          <View style={styles.replyInput}>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="Write a reply..."
              placeholderTextColor={colors.subtext}
              value={replyText}
              onChangeText={setReplyText}
            />
            <View style={styles.replyActions}>
              <Pressable onPress={() => setShowReplyInput(false)} style={styles.cancelBtn}>
                <Text style={{ color: colors.subtext }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmitReply}
                disabled={submitting || !replyText.trim()}
                style={[styles.replyBtn, { backgroundColor: colors.text, opacity: submitting || !replyText.trim() ? 0.5 : 1 }]}
              >
                <Text style={{ color: colors.background, fontWeight: '700' }}>{submitting ? '...' : 'Reply'}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setShowReplyInput(true)}>
            <Text style={[styles.replyLink, { color: colors.subtext }]}>Reply to this review</Text>
          </Pressable>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { borderBottomWidth: 1, paddingVertical: 12, gap: 6 },
  meta: { fontSize: 12 },
  replyBox: { marginTop: 8, padding: 10, borderRadius: 8, borderWidth: 1, gap: 4 },
  replyLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  replyInput: { marginTop: 8, gap: 8 },
  textInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, minHeight: 44 },
  replyActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 8, minHeight: 36, justifyContent: 'center' },
  replyBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, minHeight: 36, justifyContent: 'center' },
  replyLink: { fontSize: 13, fontWeight: '600', marginTop: 4 }
});
