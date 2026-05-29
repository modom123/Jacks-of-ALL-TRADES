import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/colors';
import { api } from '../lib/api';

const TRADES = ['Carpentry', 'Electrical', 'Plumbing', 'Landscaping', 'Drywalling', 'Roofing'];

export default function ApplyScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tradeInterest, setTradeInterest] = useState('');
  const [background, setBackground] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!fullName.trim()) { Alert.alert('Required', 'Please enter your full name.'); return; }
    if (!email.trim() || !email.includes('@')) { Alert.alert('Required', 'Please enter a valid email.'); return; }
    if (!tradeInterest) { Alert.alert('Required', 'Please select a trade interest.'); return; }

    setLoading(true);
    try {
      await api.submitApplication({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        trade_interest: tradeInterest,
        background: background.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Application Submitted!</Text>
        <Text style={styles.successText}>
          Thank you, {fullName}! Our team will review your application and reach out within 5–7
          business days.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.replace('/')}>
          <Text style={styles.btnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Apply for Apprenticeship</Text>
        <Text style={styles.subtitle}>No experience required · Detroit residents · Ages 18–35</Text>

        <Text style={styles.label}>Full Name *</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
          placeholder="Jane Smith"
          placeholderTextColor={Colors.text.muted}
        />

        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="jane@example.com"
          placeholderTextColor={Colors.text.muted}
        />

        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="(313) 555-0100"
          placeholderTextColor={Colors.text.muted}
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
              <Text
                style={[styles.tradeBtnText, tradeInterest === t && styles.tradeBtnTextActive]}
              >
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Tell Us About Yourself</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={background}
          onChangeText={setBackground}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          placeholder="Share your background, why you want to join, or any relevant experience..."
          placeholderTextColor={Colors.text.muted}
        />

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>{loading ? 'Submitting...' : 'Submit Application'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lions.black },
  content: { padding: 20 },
  title: { color: Colors.white, fontSize: 26, fontWeight: '900', marginBottom: 4 },
  subtitle: { color: Colors.lions.silver, fontSize: 13, marginBottom: 24, lineHeight: 19 },
  label: { color: Colors.lions.silver, fontSize: 13, fontWeight: '500', marginBottom: 8 },
  input: {
    backgroundColor: Colors.lions.mid,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: Colors.white,
    fontSize: 15,
    marginBottom: 16,
  },
  textarea: { height: 100, paddingTop: 12 },
  tradesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  tradeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.lions.mid,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tradeBtnActive: { backgroundColor: Colors.lions.blue, borderColor: Colors.lions.blue },
  tradeBtnText: { color: Colors.lions.silver, fontWeight: '600', fontSize: 13 },
  tradeBtnTextActive: { color: Colors.white },
  btn: {
    backgroundColor: Colors.lions.blue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  successContainer: {
    flex: 1,
    backgroundColor: Colors.lions.black,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  successIcon: { fontSize: 60, marginBottom: 20 },
  successTitle: { color: Colors.white, fontSize: 26, fontWeight: '900', marginBottom: 12 },
  successText: {
    color: Colors.lions.silver,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
});
