import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { getValidAccessToken, apiUrl } from '@/lib/api-config';

interface Contact {
  id: number;
  created_at: string;
  student_email: string;
  student_name: string | null;
  listing_title: string;
  listing_id: number;
}

export default function ContactsScreen() {
  const { accessToken } = useAuth();
  const { colors } = useTheme();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchContacts = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const token = await getValidAccessToken(accessToken);
      if (!token) {
        setLoading(false);
        return;
      }
      
      const response = await fetch(`${apiUrl}/api/contacts/landlord`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setContacts(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContacts();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchContacts]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.title, { color: colors.text }]}>Contacts</Text>
      
      {loading ? (
        <ActivityIndicator color={colors.text} style={{ marginTop: 20 }} />
      ) : contacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.subtext }]}>
            No contacts yet. Students who inquire about your listings will appear here.
          </Text>
        </View>
      ) : (
        contacts.map((contact) => (
          <View key={contact.id} style={[styles.contactItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.contactName, { color: colors.text }]}>
              {contact.student_name || contact.student_email}
            </Text>
            <Text style={[styles.contactEmail, { color: colors.subtext }]}>
              {contact.student_email}
            </Text>
            <Text style={[styles.listingTitle, { color: colors.text }]}>
              Interested in: {contact.listing_title}
            </Text>
            <Text style={[styles.contactDate, { color: colors.subtext }]}>
              Contacted on {formatDate(contact.created_at)}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 18, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '900', marginBottom: 16 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, textAlign: 'center', fontStyle: 'italic' },
  contactItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 4
  },
  contactName: { fontSize: 18, fontWeight: '700' },
  contactEmail: { fontSize: 14 },
  listingTitle: { fontSize: 15, fontWeight: '600', marginTop: 8 },
  contactDate: { fontSize: 12, marginTop: 4 }
});
