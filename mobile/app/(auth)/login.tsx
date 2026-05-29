import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { useAuthContext } from '../_layout';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { signIn, role } = useAuthContext();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setLoading(false);

    if (signInError) {
      setError(signInError);
      return;
    }

    // Redirect based on role
    if (role === 'admin') router.replace('/(admin)/dashboard');
    else if (role === 'student') router.replace('/(student)/home');
    else router.replace('/(donor)/home');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.logoRow}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>JOAT</Text>
          </View>
        </View>

        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholderTextColor={Colors.text.muted}
            placeholder="you@example.com"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor={Colors.text.muted}
            placeholder="••••••••"
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.linkRow}>
            <Text style={styles.linkText}>Don't have an account? Register</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/')} style={styles.linkRow}>
            <Text style={styles.linkText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lions.black },
  content: { padding: 24, paddingTop: 80, alignItems: 'center' },
  logoRow: { marginBottom: 28 },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.lions.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: Colors.white, fontWeight: '900', fontSize: 11 },
  title: { fontSize: 28, fontWeight: '900', color: Colors.white, marginBottom: 6 },
  subtitle: { fontSize: 15, color: Colors.lions.silver, marginBottom: 28 },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  errorText: { color: '#fca5a5', fontSize: 13 },
  form: { width: '100%' },
  label: { color: Colors.lions.silver, fontSize: 13, fontWeight: '500', marginBottom: 6 },
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
  btn: {
    backgroundColor: Colors.lions.blue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  linkRow: { alignItems: 'center', paddingVertical: 8 },
  linkText: { color: Colors.lions.silver, fontSize: 14, textDecorationLine: 'underline' },
});
