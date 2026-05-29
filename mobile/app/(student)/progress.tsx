import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

const modules = [
  { title: 'Safety & Compliance', completed: true },
  { title: 'Tool Identification', completed: true },
  { title: 'Basic Wiring', completed: true },
  { title: 'Circuit Breakers', completed: true },
  { title: 'Conduit Bending', completed: true },
  { title: 'Panel Installation', completed: true },
  { title: 'Commercial Wiring', completed: false },
  { title: 'HVAC Integration', completed: false },
  { title: 'Code Review', completed: false },
  { title: 'Job Site Practicum I', completed: false },
  { title: 'Advanced Systems', completed: false },
  { title: 'Job Site Practicum II', completed: false },
  { title: 'Certification Prep', completed: false },
  { title: 'Final Examination', completed: false },
];

const completedCount = modules.filter((m) => m.completed).length;
const pct = Math.round((completedCount / modules.length) * 100);

export default function ProgressScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>My Progress</Text>

      {/* Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Overall Completion</Text>
          <Text style={styles.summaryPct}>{pct}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.summaryDetail}>
          {completedCount} of {modules.length} modules completed
        </Text>
      </View>

      {/* Module list */}
      <Text style={styles.sectionTitle}>Modules</Text>
      {modules.map((mod, i) => (
        <View key={i} style={styles.moduleRow}>
          <View
            style={[
              styles.moduleStatus,
              mod.completed ? styles.moduleComplete : styles.modulePending,
            ]}
          >
            <Text style={styles.moduleStatusText}>{mod.completed ? '✓' : (i + 1).toString()}</Text>
          </View>
          <Text
            style={[styles.moduleTitle, !mod.completed && styles.moduleTitlePending]}
          >
            {mod.title}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lions.black },
  content: { padding: 20 },
  title: { color: Colors.white, fontSize: 26, fontWeight: '900', marginBottom: 16 },
  summaryCard: {
    backgroundColor: Colors.lions.mid,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  summaryPct: { color: Colors.lions.blue, fontWeight: '900', fontSize: 15 },
  progressBar: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: { height: '100%', backgroundColor: Colors.lions.blue, borderRadius: 5 },
  summaryDetail: { color: Colors.lions.silver, fontSize: 12 },
  sectionTitle: { color: Colors.white, fontSize: 17, fontWeight: '700', marginBottom: 12 },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  moduleStatus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleComplete: { backgroundColor: Colors.lions.blue },
  modulePending: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  moduleStatusText: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  moduleTitle: { color: Colors.white, fontSize: 14, fontWeight: '500', flex: 1 },
  moduleTitlePending: { color: Colors.lions.silver },
});
