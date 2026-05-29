import { useEffect, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { api } from '../../lib/api';
import { useAuthContext } from '../_layout';

type Stats = {
  pending_applications: number;
  total_donations_dollars: string;
  volunteer_count: number;
  unread_messages: number;
};

export default function AdminDashboardScreen() {
  const { session, signOut } = useAuthContext();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!session?.access_token) return;
    api.admin
      .getStats(session.access_token)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [session]);

  const statCards = stats
    ? [
        { label: 'Pending Apps', value: String(stats.pending_applications), color: '#EAB308' },
        { label: 'Total Raised', value: `$${stats.total_donations_dollars}`, color: '#22C55E' },
        { label: 'Unread Messages', value: String(stats.unread_messages), color: Colors.lions.blue },
        { label: 'Volunteers', value: String(stats.volunteer_count), color: '#A855F7' },
      ]
    : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Admin Dashboard</Text>

      {loading ? (
        <ActivityIndicator color={Colors.lions.blue} size="large" style={styles.loader} />
      ) : (
        <View style={styles.statsGrid}>
          {statCards.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <TouchableOpacity
        style={styles.actionRow}
        onPress={() => router.push('/(admin)/applications')}
        activeOpacity={0.85}
      >
        <Text style={styles.actionText}>Review Applications →</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.actionRow}
        onPress={() => router.push('/(admin)/messages')}
        activeOpacity={0.85}
      >
        <Text style={styles.actionText}>View Messages →</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lions.black },
  content: { padding: 20 },
  title: { color: Colors.white, fontSize: 26, fontWeight: '900', marginBottom: 20 },
  loader: { marginTop: 40 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.lions.mid,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statValue: { fontSize: 28, fontWeight: '900', marginBottom: 4 },
  statLabel: { color: Colors.lions.silver, fontSize: 12 },
  sectionTitle: { color: Colors.white, fontSize: 17, fontWeight: '700', marginBottom: 12 },
  actionRow: {
    backgroundColor: Colors.lions.mid,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  actionText: { color: Colors.white, fontWeight: '600', fontSize: 15 },
  signOutBtn: { marginTop: 24, paddingVertical: 12, alignItems: 'center' },
  signOutText: { color: Colors.lions.silver, fontSize: 14, textDecorationLine: 'underline' },
});
