import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, AppTheme } from '../context/ThemeContext';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Signup'> };

interface PasswordStrength { hasLength: boolean; hasNumber: boolean; hasSpecial: boolean; }

function checkStrength(pwd: string): PasswordStrength {
  return {
    hasLength: pwd.length >= 6,
    hasNumber: /[0-9]/.test(pwd),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd),
  };
}

export default function SignupScreen({ navigation }: Props) {
  const { theme: t } = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = checkStrength(password);
  const strengthScore = [strength.hasLength, strength.hasNumber, strength.hasSpecial].filter(Boolean).length;

  function getStrengthLabel(): { label: string; color: string } {
    if (password.length === 0) return { label: '', color: t.border };
    if (strengthScore === 1) return { label: 'Weak', color: '#EF5350' };
    if (strengthScore === 2) return { label: 'Fair', color: '#FB8C00' };
    return { label: 'Strong', color: '#43A047' };
  }

  const strengthInfo = getStrengthLabel();

  async function handleNext() {
    if (!name.trim()) { Alert.alert('Required', 'Please enter your full name.'); return; }
    if (!email.trim() || !email.includes('@')) { Alert.alert('Invalid Email', 'Please enter a valid email address.'); return; }
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) { Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number.'); return; }
    if (!strength.hasLength) { Alert.alert('Weak Password', 'Password must be at least 6 characters.'); return; }
    if (!strength.hasNumber) { Alert.alert('Weak Password', 'Password must include at least one number.'); return; }
    if (!strength.hasSpecial) { Alert.alert('Weak Password', 'Password must include at least one special character (e.g. @, #, !).'); return; }
    if (password !== confirm) { Alert.alert('Mismatch', 'Passwords do not match.'); return; }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigation.navigate('OTP', { phone: phone.trim(), name: name.trim(), email: email.trim(), password });
    }, 400);
  }

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <View style={s.logoCircle}><Text style={s.logoText}>M</Text></View>
          <Text style={s.appName}>Create Account</Text>
          <Text style={s.tagline}>Start managing your health records</Text>
        </View>

        <View style={s.form}>
          <Text style={s.label}>Full Name *</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="John Doe" placeholderTextColor={t.textMuted} autoCapitalize="words" />

          <Text style={s.label}>Email *</Text>
          <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={t.textMuted} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />

          <Text style={s.label}>Phone Number *</Text>
          <TextInput style={s.input} value={phone} onChangeText={setPhone} placeholder="+91 98765 43210" placeholderTextColor={t.textMuted} keyboardType="phone-pad" />

          <Text style={s.label}>Password *</Text>
          <View style={s.pwdRow}>
            <TextInput style={[s.input, { flex: 1, borderWidth: 0 }]} value={password} onChangeText={setPassword} placeholder="Min 6 chars, number & special char" placeholderTextColor={t.textMuted} secureTextEntry={!showPwd} />
            <TouchableOpacity onPress={() => setShowPwd(v => !v)} style={s.eyeBtn}>
              <Ionicons name={showPwd ? 'eye-off' : 'eye'} size={20} color={t.textMuted} />
            </TouchableOpacity>
          </View>

          {password.length > 0 && (
            <View style={s.strengthSection}>
              <View style={s.strengthBarRow}>
                {[0, 1, 2].map(i => (
                  <View key={i} style={[s.strengthSegment, i < strengthScore && { backgroundColor: strengthInfo.color }]} />
                ))}
              </View>
              <Text style={[s.strengthLabel, { color: strengthInfo.color }]}>{strengthInfo.label}</Text>
            </View>
          )}

          {password.length > 0 && (
            <View style={s.reqList}>
              <Req met={strength.hasLength} label="At least 6 characters" t={t} />
              <Req met={strength.hasNumber} label="Contains a number (0–9)" t={t} />
              <Req met={strength.hasSpecial} label="Contains a special character (!@#…)" t={t} />
            </View>
          )}

          <Text style={s.label}>Confirm Password *</Text>
          <TextInput style={s.input} value={confirm} onChangeText={setConfirm} placeholder="Re-enter password" placeholderTextColor={t.textMuted} secureTextEntry={!showPwd} />

          <View style={s.infoBox}>
            <Text style={s.infoText}>📱 An OTP will be sent to your phone number to verify your account.</Text>
          </View>

          <TouchableOpacity style={[s.button, loading && s.buttonDisabled]} onPress={handleNext} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Send OTP →</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={s.linkText}>Already have an account? <Text style={s.link}>Login</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Req({ met, label, t }: { met: boolean; label: string; t: AppTheme }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
      <Ionicons name={met ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={met ? '#43A047' : t.textMuted} />
      <Text style={{ fontSize: 12, color: met ? '#43A047' : t.textMuted }}>{label}</Text>
    </View>
  );
}

const makeStyles = (t: AppTheme) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: t.bg },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 28 },
  logoCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#1565C0', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  logoText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  appName: { fontSize: 24, fontWeight: '700', color: '#1565C0' },
  tagline: { color: t.textSecondary, marginTop: 4, fontSize: 13 },
  form: { backgroundColor: t.surface, borderRadius: 16, padding: 24, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
  label: { fontSize: 13, fontWeight: '600', color: t.text, marginBottom: 5, marginTop: 10 },
  input: { borderWidth: 1.5, borderColor: t.border, borderRadius: 10, padding: 11, fontSize: 14, color: t.text, backgroundColor: t.inputBg },
  pwdRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: t.border, borderRadius: 10, backgroundColor: t.inputBg },
  eyeBtn: { padding: 11 },
  strengthSection: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  strengthBarRow: { flex: 1, flexDirection: 'row', gap: 4 },
  strengthSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: t.border },
  strengthLabel: { fontSize: 12, fontWeight: '700', minWidth: 38 },
  reqList: { marginTop: 8, marginBottom: 4, paddingLeft: 2 },
  infoBox: { backgroundColor: t.primaryLight, borderRadius: 8, padding: 12, marginTop: 16 },
  infoText: { fontSize: 13, color: '#1565C0', lineHeight: 18 },
  button: { backgroundColor: '#1565C0', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 16, elevation: 2 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  linkText: { textAlign: 'center', marginTop: 18, color: t.textSecondary, fontSize: 14 },
  link: { color: '#1565C0', fontWeight: '600' },
});
