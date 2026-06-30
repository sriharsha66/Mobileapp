import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { useTheme, AppTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'> };

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { sendPasswordResetCode } = useAuth();
  const { theme: t } = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) { Alert.alert('Invalid Email', 'Please enter a valid email address.'); return; }
    setLoading(true);
    try {
      const code = await sendPasswordResetCode(trimmed);
      Alert.alert('📧 Reset Code Sent (Demo)', `A 6-digit reset code has been sent to:\n\n${trimmed}\n\nDemo code:\n\n${code}\n\n(In production, this would be delivered via email.)\n\nCode is valid for 10 minutes.`,
        [{ text: 'Enter Code', onPress: () => navigation.navigate('ResetPassword', { email: trimmed }) }]);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <View style={s.iconCircle}>
            <Ionicons name="lock-open-outline" size={36} color="#1565C0" />
          </View>
          <Text style={s.title}>Forgot Password?</Text>
          <Text style={s.subtitle}>Enter your registered email and we'll send you a reset code.</Text>
        </View>

        <View style={s.card}>
          <Text style={s.label}>Registered Email</Text>
          <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={t.textMuted} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />

          <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleSend} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Send Reset Code</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backLink}>
            <Ionicons name="arrow-back" size={16} color="#1565C0" />
            <Text style={s.backText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t: AppTheme) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: t.bg },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: t.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: t.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: t.textSecondary, textAlign: 'center', lineHeight: 20 },
  card: { backgroundColor: t.surface, borderRadius: 16, padding: 24, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
  label: { fontSize: 13, fontWeight: '600', color: t.text, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: t.border, borderRadius: 10, padding: 12, fontSize: 15, color: t.text, backgroundColor: t.inputBg },
  btn: { backgroundColor: '#1565C0', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 20, elevation: 2 },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, gap: 6 },
  backText: { color: '#1565C0', fontSize: 14, fontWeight: '600' },
});
