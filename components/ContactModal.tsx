import { Linking, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';

interface ContactModalProps {
  whatsappUrl?: string;
  onInAppMessage?: () => void;
  loading?: boolean;
}

export function ContactModal({ whatsappUrl, onInAppMessage, loading }: ContactModalProps) {
  return (
    <View style={{ gap: 12, paddingHorizontal: 4 }}>
      <Text style={{ fontSize: 18, fontWeight: '800' }}>Contact landlord</Text>
      <Text style={{ fontSize: 14, opacity: 0.7 }}>
        Reach out via WhatsApp or send an in-app inquiry that notifies the landlord.
      </Text>
      <Button
        title="Open WhatsApp"
        onPress={() => whatsappUrl && Linking.openURL(whatsappUrl)}
        disabled={!whatsappUrl}
      />
      <Button
        title="Send In-App Message"
        variant="secondary"
        loading={loading}
        onPress={onInAppMessage}
      />
    </View>
  );
}
