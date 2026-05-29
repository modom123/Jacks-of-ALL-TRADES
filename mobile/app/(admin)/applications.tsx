import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { api } from '../../lib/api';
import { useAuthContext } from '../_layout';

type Application = {
  id: string;
  full_name: string;
  email: string;
  trade_interest: string | null;
  status: string;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#EAB308',
  reviewing: Colors.lions.blue,
  accepted: '#22C55E',
  rejected: '#EF4444',
};

export default function AdminApplicationsScreen() {
  const { session } = useAuthContext();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApplications = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const res = await api.admin.getApplications(session.access_token);
      setApplications(res.applications);
    } catch (err) {
      Alert.alert('Error', 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const updateStatus = async (id: string, status: string) => {
    if (!session?.access_token) return;
    try {
      await api.admin.updateApplication(session.access_token, id, { status });
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      );
    } catch {
      Alert.alert('Error', 'Failed to update application');
    }
  };

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
      data={applications}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <Text style={styles.title}>Applications ({applications.length})</Text>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>No applications found.</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.name}>{item.full_name}</Text>
            <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] + '33' }]}>
              <Text style={[styles.badgeText, { color: STATUS_COLORS[item.status] }]}>
                {item.status}
              </Text>
            </View>
          </View>
          <Text style={styles.email}>{item.email}</Text>
          {item.trade_interest && (
            <Text style={styles.trade}>Trade: {item.trade_interest}</Text>
          )}
          <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>

          <View style={styles.actions}>
            {item.status !== 'accepted' && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={() => updateStatus(item.id, 'accepted')}
                activeOpacity={0.85}
              >
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
            )}
            {item.status !== 'reviewing' && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.reviewBtn]}
                onPress={() => updateStatus(item.id, 'reviewing')}
                activeOpacity={0.85}
              >
                <Text style={styles.reviewText}>Review</Text>
              </TouchableOpacity>
            )}
            {item.status !== 'rejected' && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                onPress={() => updateStatus(item.id, 'rejected')}
                activeOpacity={0.85}
              >
                <Text style={styles.rejectText}>Reject</Text>
              </TouchableOpacity>
            )}
          </View>
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
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  email: { color: Colors.lions.silver, fontSize: 13, marginBottom: 2 },
  trade: { color: Colors.lions.blue, fontSize: 12, marginBottom: 2 },
  date: { color: 'rgba(255,255,255,0.3)', fontSize: 11, marginBottom: 10 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  acceptBtn: { backgroundColor: 'rgba(34,197,94,0.15)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
  acceptText: { color: '#4ade80', fontWeight: '700', fontSize: 12 },
  reviewBtn: { backgroundColor: 'rgba(0,118,182,0.15)', borderWidth: 1, borderColor: 'rgba(0,118,182,0.3)' },
  reviewText: { color: Colors.lions.blue, fontWeight: '700', fontSize: 12 },
  rejectBtn: { backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  rejectText: { color: '#f87171', fontWeight: '700', fontSize: 12 },
});
