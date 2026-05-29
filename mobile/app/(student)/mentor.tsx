import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';

export default function MentorScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Your Mentor</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>MW</Text>
        </View>
        <Text style={styles.name}>Marcus Williams</Text>
        <Text style={styles.role}>Licensed Master Electrician</Text>
        <Text style={styles.experience}>12 years experience · JATC Certified</Text>

        <View style={styles.tagsRow}>
          {['Electrical', 'Commercial', 'Residential', 'HVAC'].map((t) => (
            <View key={t} style={styles.tag}>
              <Text style={styles.tagText}>{t}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Contact</Text>
      <View style={styles.contactCard}>
        <View style={styles.contactRow}>
          <Text style={styles.contactLabel}>Email</Text>
          <Text style={styles.contactValue}>m.williams@joatdetroit.org</Text>
        </View>
        <View style={styles.contactRow}>
          <Text style={styles.contactLabel}>Office Hours</Text>
          <Text style={styles.contactValue}>Mon–Fri, 3–5 PM</Text>
        </View>
        <View style={[styles.contactRow, styles.noBorder]}>
          <Text style={styles.contactLabel}>Next Session</Text>
          <Text style={styles.contactValue}>Thursday, 8:00 AM</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.messageBtn} activeOpacity={0.85}>
        <Text style={styles.messageBtnText}>Send Message</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lions.black },
  content: { padding: 20 },
  title: { color: Colors.white, fontSize: 26, fontWeight: '900', marginBottom: 20 },
  profileCard: {
    backgroundColor: Colors.lions.mid,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.lions.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { color: Colors.white, fontSize: 22, fontWeight: '900' },
  name: { color: Colors.white, fontSize: 20, fontWeight: '900', marginBottom: 4 },
  role: { color: Colors.lions.blue, fontSize: 14, fontWeight: '600', marginBottom: 4 },
  experience: { color: Colors.lions.silver, fontSize: 13, marginBottom: 14 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(0,118,182,0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,118,182,0.3)',
  },
  tagText: { color: Colors.lions.blue, fontSize: 12, fontWeight: '600' },
  sectionTitle: { color: Colors.white, fontSize: 17, fontWeight: '700', marginBottom: 10 },
  contactCard: {
    backgroundColor: Colors.lions.mid,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
    overflow: 'hidden',
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  noBorder: { borderBottomWidth: 0 },
  contactLabel: { color: Colors.lions.silver, fontSize: 13 },
  contactValue: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  messageBtn: {
    backgroundColor: Colors.lions.blue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  messageBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
});
