import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Signup'>;
};

export default function SignupScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleNext() {
    if (!name.trim()) { Alert.alert('Required', 'Please enter your full name.'); return; }
    if (!email.trim() || !email.includes('@')) { Alert.alert('Invalid Email', 'Please enter a valid email address.'); return; }
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) { Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number.'); return; }
    if (password.length < 6) { Alert.alert('Weak Password', 'Password must be at least 6 characters.'); return; }
    if (password !== confirm) { Alert.alert('Mismatch', 'Passwords do not match.'); return; }

    setLoading(true);
    // Small delay to simulate network call, then navigate to OTP
    setTimeout(() => {
      setLoading(false);
      navigation.navigate('OTP', {
        phone: phone.trim(),
        name: name.trim(),
        email: email.trim(),
        password,
      });
    }, 600);
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>M</Text>
          </View>
          <Text style={styles.appName}>Create Account</Text>
          <Text style={styles.tagline}>Start managing your health records</Text>
        </View>

        <View style={styles.form}>
          <Field label="Full Name *" value={name} onChangeText={setName} placeholder="John Doe" autoCapitalize="words" />
          <Field label="Email *" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Field label="Phone Number *" value={phone} onChangeText={setPhone} placeholder="+91 98765 43210" keyboardType="phone-pad" />
          <Field label="Password *" value={password} onChangeText={setPassword} placeholder="Min 6 characters" secureTextEntry />
          <Field label="Confirm Password *" value={confirm} onChangeText={setConfirm} placeholder="Re-enter password" secureTextEntry />

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>📱 An OTP will be sent to your phone number to verify your account.</Text>
          </View>

          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleNext} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send OTP →</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.linkText}>Already have an account? <Text style={styles.link}>Login</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize,
}: {
  label: string; value: string; onChangeText: (t: string) => void; placeholder?: string;
  secureTextEntry?: boolean; keyboardType?: any; autoCapitalize?: any;
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholder={placeholder} placeholderTextColor="#9E9E9E" value={value} onChangeText={onChangeText} secureTextEntry={secureTextEntry} keyboardType={keyboardType} autoCapitalize={autoCapitalize} />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F8FAFE' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 28 },
  logoCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#1565C0', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  logoText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  appName: { fontSize: 24, fontWeight: '700', color: '#1565C0' },
  tagline: { color: '#757575', marginTop: 4, fontSize: 13 },
  form: { backgroundColor: '#fff', borderRadius: 16, padding: 24, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#424242', marginBottom: 5, marginTop: 10 },
  input: { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10, padding: 11, fontSize: 14, color: '#212121', backgroundColor: '#FAFAFA' },
  infoBox: { backgroundColor: '#E3F2FD', borderRadius: 8, padding: 12, marginTop: 16 },
  infoText: { fontSize: 13, color: '#1565C0', lineHeight: 18 },
  button: { backgroundColor: '#1565C0', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 16, elevation: 2 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  linkText: { textAlign: 'center', marginTop: 18, color: '#757575', fontSize: 14 },
  link: { color: '#1565C0', fontWeight: '600' },
});
