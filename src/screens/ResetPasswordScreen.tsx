import React, { useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, Keyboard,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { useTheme, AppTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;
  route: RouteProp<AuthStackParamList, 'ResetPassword'>;
};

function validatePassword(pwd: string): string | null {
  if (pwd.length < 6) return 'At least 6 characters required';
  if (!/[0-9]/.test(pwd)) return 'Must include at least one number';
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd)) return 'Must include at least one special character';
  return null;
}

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const { resetPassword, sendPasswordResetCode } = useAuth();
  const { theme: t } = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [sentCode, setSentCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<Array<TextInput | null>>([]);

  function handleDigit(value: string, index: number) {
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) inputs.current[index + 1]?.focus();
    else if (digit && index === 5) Keyboard.dismiss();
    if (!digit && index > 0) inputs.current[index - 1]?.focus();
  }

  async function handleResend() {
    try {
      const code = await sendPasswordResetCode(email);
      setSentCode(code);
      Alert.alert('New Code Sent', `New reset code:\n\n${code}\n\nValid for 10 minutes.`);
      setOtp(['', '', '', '', '', '']);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  async function handleReset() {
    const entered = otp.join('');
    if (entered.length < 6) { Alert.alert('Incomplete', 'Please enter the 6-digit reset code.'); return; }
    const pwdError = validatePassword(newPassword);
    if (pwdError) { Alert.alert('Weak Password', pwdError); return; }
    if (newPassword !== confirm) { Alert.alert('Mismatch', 'Passwords do not match.'); return; }
    setLoading(true);
    try {
      await resetPassword(email, entered, sentCode || entered, newPassword);
      Alert.alert('✅ Password Reset!', 'Your password has been updated. Please log in with your new password.', [
        { text: 'Login', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  const pwdError = newPassword.length > 0 ? validatePassword(newPassword) : null;

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <View style={s.iconCircle}>
            <Ionicons name="key-outline" size={36} color="#1565C0" />
          </View>
          <Text style={s.title}>Reset Password</Text>
          <Text style={s.subtitle}>Enter the code sent to <Text style={s.em}>{email}</Text></Text>
        </View>

        <View style={s.card}>
          <Text style={s.label}>6-Digit Reset Code</Text>
          <View style={s.otpRow}>
            {otp.map((d, i) => (
              <TextInput
                key={i}
                ref={r => { inputs.current[i] = r; }}
                style={[s.otpBox, d ? s.otpBoxFilled : null]}
                value={d}
                onChangeText={v => handleDigit(v, i)}
                onKeyPress={({ nativeEvent }) => { if (nativeEvent.key === 'Backspace' && !otp[i] && i > 0) inputs.current[i - 1]?.focus(); }}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                textAlign="center"
              />
            ))}
          </View>
          <TouchableOpacity onPress={handleResend} style={s.resendBtn}>
            <Text style={s.resendText}>Resend code</Text>
          </TouchableOpacity>

          <Text style={[s.label, { marginTop: 20 }]}>New Password</Text>
          <View style={s.pwdRow}>
            <TextInput style={[s.input, { flex: 1 }]} value={newPassword} onChangeText={setNewPassword} placeholder="Min 6 chars, number & special char" placeholderTextColor={t.textMuted} secureTextEntry={!showPwd} />
            <TouchableOpacity onPress={() => setShowPwd(v => !v)} style={s.eyeBtn}>
              <Ionicons name={showPwd ? 'eye-off' : 'eye'} size={20} color={t.textMuted} />
            </TouchableOpacity>
          </View>
          {pwdError && <Text style={s.pwdError}>{pwdError}</Text>}

          <Text style={s.label}>Confirm New Password</Text>
          <TextInput style={s.input} value={confirm} onChangeText={setConfirm} placeholder="Re-enter new password" placeholderTextColor={t.textMuted} secureTextEntry={!showPwd} />

          <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleReset} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Reset Password</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t: AppTheme) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: t.bg },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 28 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: t.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 24, fontWeight: '700', color: t.text, marginBottom: 6 },
  subtitle: { fontSize: 13, color: t.textSecondary, textAlign: 'center' },
  em: { color: '#1565C0', fontWeight: '700' },
  card: { backgroundColor: t.surface, borderRadius: 16, padding: 24, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
  label: { fontSize: 13, fontWeight: '600', color: t.text, marginBottom: 8 },
  otpRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 8 },
  otpBox: { width: 44, height: 52, borderRadius: 10, borderWidth: 2, borderColor: t.border, fontSize: 20, fontWeight: '700', color: t.text, backgroundColor: t.inputBg },
  otpBoxFilled: { borderColor: '#1565C0', backgroundColor: t.primaryLight },
  resendBtn: { alignSelf: 'flex-end', marginBottom: 4 },
  resendText: { fontSize: 13, color: '#1565C0', fontWeight: '600' },
  pwdRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: t.border, borderRadius: 10, backgroundColor: t.inputBg },
  input: { borderWidth: 1.5, borderColor: t.border, borderRadius: 10, padding: 12, fontSize: 14, color: t.text, backgroundColor: t.inputBg },
  eyeBtn: { padding: 12 },
  pwdError: { fontSize: 12, color: '#EF5350', marginTop: 4, marginBottom: 4 },
  btn: { backgroundColor: '#1565C0', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 20, elevation: 2 },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
