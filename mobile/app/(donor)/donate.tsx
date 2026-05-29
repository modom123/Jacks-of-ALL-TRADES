import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Colors } from '../../constants/colors';
import { api } from '../../lib/api';
import { useAuthContext } from '../_layout';

const PRESET_AMOUNTS = [25, 50, 100, 250];

export default function DonateScreen() {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(50);
  const [customAmount, setCustomAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { profile } = useAuthContext();

  const getAmountCents = (): number | null => {
    if (customAmount) {
      const parsed = parseFloat(customAmount.replace(/[^0-9.]/g, ''));
      if (!isNaN(parsed) && parsed >= 1) return Math.round(parsed * 100);
      return null;
    }
    return selectedAmount ? selectedAmount * 100 : null;
  };

  const handleDonate = async () => {
    const amountCents = getAmountCents();
    if (!amountCents) {
      Alert.alert('Invalid Amount', 'Please select or enter a donation amount.');
      return;
    }

    setLoading(true);
    try {
      const result = await api.createDonationSession({
        donor_name: donorName || profile?.full_name || undefined,
        donor_email: donorEmail || undefined,
        amount_cents: amountCents,
        type: 'financial',
      });
      await WebBrowser.openBrowserAsync(result.url);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to start checkout.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Make a Donation</Text>
      <Text style={styles.subtitle}>Every dollar supports Detroit youth apprenticeships</Text>

      {/* Amount selector */}
      <Text style={styles.label}>Donation Amount</Text>
      <View style={styles.amountsGrid}>
        {PRESET_AMOUNTS.map((amt) => (
          <TouchableOpacity
            key={amt}
            style={[
              styles.amountBtn,
              selectedAmount === amt && !customAmount && styles.amountBtnActive,
            ]}
            onPress={() => { setSelectedAmount(amt); setCustomAmount(''); }}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.amountBtnText,
                selectedAmount === amt && !customAmount && styles.amountBtnTextActive,
              ]}
            >
              ${amt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Custom Amount</Text>
      <TextInput
        style={styles.input}
        value={customAmount}
        onChangeText={(v) => { setCustomAmount(v); setSelectedAmount(null); }}
        keyboardType="decimal-pad"
        placeholder="Enter amount (e.g. 75)"
        placeholderTextColor={Colors.text.muted}
      />

      <Text style={styles.label}>Your Name (optional)</Text>
      <TextInput
        style={styles.input}
        value={donorName}
        onChangeText={setDonorName}
        placeholder="Jane Smith"
        placeholderTextColor={Colors.text.muted}
      />

      <Text style={styles.label}>Email for Receipt (optional)</Text>
      <TextInput
        style={styles.input}
        value={donorEmail}
        onChangeText={setDonorEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="jane@example.com"
        placeholderTextColor={Colors.text.muted}
      />

      <TouchableOpacity
        style={[styles.donateBtn, loading && styles.donateBtnDisabled]}
        onPress={handleDonate}
        disabled={loading}
        activeOpacity={0.85}
      >
        <Text style={styles.donateBtnText}>
          {loading ? 'Opening Checkout...' : 'Donate Securely'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>Secured by Stripe · Tax-deductible receipt provided</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lions.black },
  content: { padding: 20 },
  title: { color: Colors.white, fontSize: 26, fontWeight: '900', marginBottom: 4 },
  subtitle: { color: Colors.lions.silver, fontSize: 14, marginBottom: 24 },
  label: { color: Colors.lions.silver, fontSize: 13, fontWeight: '500', marginBottom: 8 },
  amountsGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  amountBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: Colors.lions.mid,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  amountBtnActive: { backgroundColor: Colors.lions.blue, borderColor: Colors.lions.blue },
  amountBtnText: { color: Colors.lions.silver, fontWeight: '700', fontSize: 15 },
  amountBtnTextActive: { color: Colors.white },
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
  donateBtn: {
    backgroundColor: Colors.lions.blue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  donateBtnDisabled: { opacity: 0.6 },
  donateBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  disclaimer: { color: Colors.text.muted, fontSize: 12, textAlign: 'center' },
});
