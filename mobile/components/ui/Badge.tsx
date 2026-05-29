import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

type BadgeVariant = 'blue' | 'green' | 'yellow' | 'red' | 'gray';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const COLORS: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  blue: { bg: 'rgba(0,118,182,0.15)', text: Colors.lions.blue, border: 'rgba(0,118,182,0.3)' },
  green: { bg: 'rgba(34,197,94,0.15)', text: '#4ade80', border: 'rgba(34,197,94,0.3)' },
  yellow: { bg: 'rgba(234,179,8,0.15)', text: '#fbbf24', border: 'rgba(234,179,8,0.3)' },
  red: { bg: 'rgba(239,68,68,0.15)', text: '#f87171', border: 'rgba(239,68,68,0.3)' },
  gray: { bg: 'rgba(255,255,255,0.08)', text: Colors.lions.silver, border: 'rgba(255,255,255,0.15)' },
};

export default function Badge({ label, variant = 'gray' }: BadgeProps) {
  const c = COLORS[variant];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.text, { color: c.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
});
