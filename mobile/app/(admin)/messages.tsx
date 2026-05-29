import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { api } from '../../lib/api';
import { useAuthContext } from '../_layout';

type Contact = {
  id: string;
  full_name: string;
  email: string;
  subject: string | null;
  message: string;
  type: string;
  created_at: string;
};

export default function AdminMessagesScreen() {
  const { session } = useAuthContext();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const res = await api.admin.getContacts(session.access_token) as { contacts: Contact[] };
      setContacts(res.contacts);
    } catch {
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.lions.blue} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={contacts}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={<Text style={styles.title}>Messages ({contacts.length})</Text>}
      ListEmptyComponent={<Text style={styles.empty}>No messages found.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.name}>{item.full_name}</Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{item.type}</Text>
            </View>
          </View>
          <Text style={styles.email}>{item.email}</Text>
          {item.subject && <Text style={styles.subject}>{item.subject}</Text>}
          <Text style={styles.message} numberOfLines={4}>{item.message}</Text>
          <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lions.black },
  content: { padding: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.lions.black },
  title: { color: Colors.white, fontSize: 22, fontWeight: '900', marginBottom: 16 },
  empty: { color: Colors.lions.silver, textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: Colors.lions.mid,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(0,118,182,0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,118,182,0.3)',
  },
  typeText: { color: Colors.lions.blue, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  email: { color: Colors.lions.silver, fontSize: 13, marginBottom: 4 },
  subject: { color: 'rgba(255,255,255,0.8)', fontWeight: '600', fontSize: 14, marginBottom: 6 },
  message: { color: Colors.lions.silver, fontSize: 13, lineHeight: 19 },
  date: { color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 8 },
});
