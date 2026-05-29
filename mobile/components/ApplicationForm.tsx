import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { api } from '../lib/api';
import Input from './ui/Input';
import Button from './ui/Button';

const TRADES = ['Carpentry', 'Electrical', 'Plumbing', 'Landscaping', 'Drywalling', 'Roofing'];

interface ApplicationFormProps {
  onSuccess?: () => void;
}

export default function ApplicationForm({ onSuccess }: ApplicationFormProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tradeInterest, setTradeInterest] = useState('');
  const [background, setBackground] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!fullName.trim() || !email.trim() || !tradeInterest) {
      Alert.alert('Required Fields', 'Please fill in name, email, and trade interest.');
      return;
    }
    setLoading(true);
    try {
      await api.submitApplication({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone || undefined,
        trade_interest: tradeInterest,
        background: background || undefined,
      });
      onSuccess?.();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <Input
        label="Full Name *"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
        placeholder="Jane Smith"
      />
      <Input
        label="Email *"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="jane@example.com"
      />
      <Input
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="(313) 555-0100"
      />

      <Text style={styles.label}>Trade Interest *</Text>
      <View style={styles.tradesGrid}>
        {TRADES.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tradeBtn, tradeInterest === t && styles.tradeBtnActive]}
            onPress={() => setTradeInterest(t)}
            activeOpacity={0.85}
          >
            <Text style={[styles.tradeBtnText, tradeInterest === t && styles.tradeBtnTextActive]}>
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Input
        label="Background (optional)"
        value={background}
        onChangeText={setBackground}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        placeholder="Tell us about yourself..."
        style={{ height: 90, paddingTop: 10 }}
      />

      <Button label={loading ? 'Submitting...' : 'Submit Application'} onPress={handleSubmit} loading={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: Colors.lions.silver, fontSize: 13, fontWeight: '500', marginBottom: 8 },
  tradesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tradeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.lions.mid,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tradeBtnActive: { backgroundColor: Colors.lions.blue, borderColor: Colors.lions.blue },
  tradeBtnText: { color: Colors.lions.silver, fontSize: 12, fontWeight: '600' },
  tradeBtnTextActive: { color: Colors.white },
});
