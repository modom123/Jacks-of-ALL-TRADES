import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { useAuthContext } from '../_layout';

export default function StudentHomeScreen() {
  const { profile } = useAuthContext();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Welcome */}
      <View style={styles.welcomeCard}>
        <Text style={styles.welcomeLabel}>Good to see you,</Text>
        <Text style={styles.welcomeName}>{profile?.full_name || 'Apprentice'} 👋</Text>
        <View style={styles.tradeBadge}>
          <Text style={styles.tradeText}>
            Trade: {profile?.trade_interest || 'Not assigned yet'}
          </Text>
        </View>
      </View>

      {/* Mentor */}
      <Text style={styles.sectionTitle}>Your Mentor</Text>
      <View style={styles.card}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>M</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>Marcus Williams</Text>
          <Text style={styles.cardSubtitle}>Licensed Electrician · 12 yrs exp.</Text>
          <Text style={styles.cardLink}>Message →</Text>
        </View>
      </View>

      {/* Schedule */}
      <Text style={styles.sectionTitle}>Upcoming Schedule</Text>
      <View style={styles.card}>
        <View>
          <Text style={styles.scheduleDay}>Monday – Wednesday</Text>
          <Text style={styles.scheduleTime}>7:00 AM – 3:00 PM</Text>
          <Text style={styles.scheduleLocation}>📍 1425 Woodward Ave, Detroit</Text>
        </View>
      </View>

      {/* Progress */}
      <Text style={styles.sectionTitle}>Program Progress</Text>
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Electrical Apprenticeship</Text>
          <Text style={styles.progressPct}>42%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '42%' }]} />
        </View>
        <Text style={styles.progressLabel}>6 of 14 modules completed</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lions.black },
  content: { padding: 20, paddingTop: 24 },
  welcomeCard: {
    backgroundColor: Colors.lions.blue,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  welcomeLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  welcomeName: { color: Colors.white, fontSize: 24, fontWeight: '900', marginBottom: 10 },
  tradeBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  tradeText: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  sectionTitle: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 4,
  },
  card: {
    backgroundColor: Colors.lions.mid,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 14,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.lions.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Colors.white, fontSize: 18, fontWeight: '900' },
  cardInfo: { flex: 1 },
  cardTitle: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  cardSubtitle: { color: Colors.lions.silver, fontSize: 13, marginTop: 2 },
  cardLink: { color: Colors.lions.blue, fontSize: 13, marginTop: 6 },
  scheduleDay: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  scheduleTime: { color: Colors.lions.silver, fontSize: 13, marginTop: 4 },
  scheduleLocation: { color: Colors.lions.silver, fontSize: 13, marginTop: 4 },
  progressCard: {
    backgroundColor: Colors.lions.mid,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressTitle: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  progressPct: { color: Colors.lions.blue, fontWeight: '900', fontSize: 15 },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: { height: '100%', backgroundColor: Colors.lions.blue, borderRadius: 4 },
  progressLabel: { color: Colors.lions.silver, fontSize: 12 },
});
