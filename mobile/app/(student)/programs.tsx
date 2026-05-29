import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';

const programs = [
  { icon: '🪚', title: 'Carpentry', duration: '12 months', wage: '$18–$28/hr', desc: 'Framing, finishing, cabinetry and furniture making.' },
  { icon: '⚡', title: 'Electrical', duration: '18 months', wage: '$22–$35/hr', desc: 'Wiring, panels, code compliance and installation.' },
  { icon: '🔧', title: 'Plumbing', duration: '18 months', wage: '$20–$32/hr', desc: 'Pipe fitting, fixture installation, water systems.' },
  { icon: '🌿', title: 'Landscaping', duration: '9 months', wage: '$16–$22/hr', desc: 'Horticulture, grounds design, sustainable care.' },
  { icon: '🏠', title: 'Drywalling', duration: '6 months', wage: '$17–$25/hr', desc: 'Hanging, taping, finishing and texturing interiors.' },
  { icon: '🔨', title: 'Roofing', duration: '9 months', wage: '$19–$28/hr', desc: 'Shingles, flat roofs, insulation and repairs.' },
];

export default function ProgramsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Trade Programs</Text>
      <Text style={styles.subtitle}>Select a trade to see program details</Text>

      {programs.map((p) => (
        <TouchableOpacity key={p.title} style={styles.card} activeOpacity={0.85}>
          <Text style={styles.icon}>{p.icon}</Text>
          <View style={styles.info}>
            <Text style={styles.programTitle}>{p.title}</Text>
            <Text style={styles.programDesc}>{p.desc}</Text>
            <View style={styles.meta}>
              <Text style={styles.metaBlue}>⏱ {p.duration}</Text>
              <Text style={styles.metaGreen}>💰 {p.wage}</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lions.black },
  content: { padding: 20 },
  title: { color: Colors.white, fontSize: 26, fontWeight: '900', marginBottom: 4 },
  subtitle: { color: Colors.lions.silver, fontSize: 14, marginBottom: 20 },
  card: {
    backgroundColor: Colors.lions.mid,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 14,
  },
  icon: { fontSize: 36 },
  info: { flex: 1 },
  programTitle: { color: Colors.white, fontSize: 17, fontWeight: '700', marginBottom: 4 },
  programDesc: { color: Colors.lions.silver, fontSize: 13, lineHeight: 19, marginBottom: 8 },
  meta: { flexDirection: 'row', gap: 14 },
  metaBlue: { color: Colors.lions.blue, fontSize: 12, fontWeight: '600' },
  metaGreen: { color: '#4ade80', fontSize: 12, fontWeight: '600' },
});
