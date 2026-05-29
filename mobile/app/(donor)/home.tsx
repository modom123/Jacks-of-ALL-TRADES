import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { useAuthContext } from '../_layout';

export default function DonorHomeScreen() {
  const { profile, signOut } = useAuthContext();
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Hello, {profile?.full_name || 'Friend'} 👋</Text>
      <Text style={styles.subtitle}>Thank you for supporting Detroit youth.</Text>

      <View style={styles.cardGrid}>
        <TouchableOpacity
          style={[styles.actionCard, styles.blueCard]}
          onPress={() => router.push('/(donor)/donate')}
          activeOpacity={0.85}
        >
          <Text style={styles.cardIcon}>❤️</Text>
          <Text style={styles.cardTitle}>Donate</Text>
          <Text style={styles.cardDesc}>Make a financial contribution</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/(donor)/shop')}
          activeOpacity={0.85}
        >
          <Text style={styles.cardIcon}>🛍️</Text>
          <Text style={styles.cardTitle}>Shop</Text>
          <Text style={styles.cardDesc}>Candy, popcorn, merch</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.missionCard}>
        <Text style={styles.missionTitle}>Your Impact</Text>
        <Text style={styles.missionText}>
          Every donation funds tools, certifications, and instructor time — turning Detroit youth
          into skilled professionals.
        </Text>
      </View>

      <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lions.black },
  content: { padding: 20, paddingTop: 28 },
  greeting: { color: Colors.white, fontSize: 26, fontWeight: '900', marginBottom: 4 },
  subtitle: { color: Colors.lions.silver, fontSize: 14, marginBottom: 24 },
  cardGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.lions.mid,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  blueCard: { backgroundColor: Colors.lions.blue, borderColor: 'transparent' },
  cardIcon: { fontSize: 32, marginBottom: 8 },
  cardTitle: { color: Colors.white, fontSize: 17, fontWeight: '700', marginBottom: 4 },
  cardDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  missionCard: {
    backgroundColor: Colors.lions.mid,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  missionTitle: { color: Colors.white, fontWeight: '700', fontSize: 16, marginBottom: 8 },
  missionText: { color: Colors.lions.silver, fontSize: 14, lineHeight: 20 },
  signOutBtn: { paddingVertical: 12, alignItems: 'center' },
  signOutText: { color: Colors.lions.silver, fontSize: 14, textDecorationLine: 'underline' },
});
