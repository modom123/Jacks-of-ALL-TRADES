import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface StatCardProps {
  value: string;
  label: string;
  color?: string;
}

export default function StatCard({ value, label, color = Colors.lions.blue }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.lions.mid,
    borderRadius: 14,
    padding: 16,
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  value: { fontSize: 28, fontWeight: '900', marginBottom: 4 },
  label: { color: Colors.lions.silver, fontSize: 12 },
});
