import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../constants/colors';

const { width } = Dimensions.get('window');

const programs = ['Carpentry', 'Electrical', 'Plumbing', 'Landscaping', 'Drywalling', 'Roofing'];

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar style="light" />

      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>JOAT</Text>
        </View>

        <View style={styles.tagBadge}>
          <Text style={styles.tagText}>Detroit Nonprofit · Est. 2020</Text>
        </View>

        <Text style={styles.headline}>Building Futures,{'\n'}Rebuilding Detroit</Text>

        <Text style={styles.subtext}>
          Trade apprenticeships and mentoring programs for Detroit youth aged 18–35.
          No experience required.
        </Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { value: '200+', label: 'Trained' },
            { value: '85%', label: 'Placed' },
            { value: '$2M+', label: 'Earned' },
          ].map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* CTAs */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push('/apply')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Apply Now</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryBtnText}>Log In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={() => router.push('/(donor)/shop')}
          activeOpacity={0.85}
        >
          <Text style={styles.ghostBtnText}>Browse Shop & Donate</Text>
        </TouchableOpacity>
      </View>

      {/* Programs section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Trade Programs</Text>
        <Text style={styles.sectionTitle}>Six Paths to a Career</Text>
        <View style={styles.programsGrid}>
          {programs.map((p) => (
            <View key={p} style={styles.programCard}>
              <Text style={styles.programName}>{p}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lions.black,
  },
  content: {
    paddingBottom: 40,
  },
  hero: {
    paddingTop: 80,
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.lions.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  tagBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.lions.blue + '66',
    backgroundColor: Colors.lions.blue + '1A',
    marginBottom: 20,
  },
  tagText: {
    color: Colors.lions.blue,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },
  headline: {
    fontSize: 34,
    fontWeight: '900',
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 42,
    marginBottom: 16,
  },
  subtext: {
    fontSize: 15,
    color: Colors.lions.silver,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    maxWidth: width * 0.82,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 32,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.lions.blue,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.lions.silver,
    marginTop: 2,
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: Colors.lions.blue,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: 10,
  },
  secondaryBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  ghostBtn: {
    paddingVertical: 12,
  },
  ghostBtnText: {
    color: Colors.lions.silver,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  sectionLabel: {
    color: Colors.lions.blue,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sectionTitle: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 16,
  },
  programsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  programCard: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.lions.mid,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  programName: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
});
