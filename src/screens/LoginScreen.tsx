import React, { useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, Keyboard,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { useTheme, AppTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { hapticMedium } from '../utils/haptics';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'> };

type Tab = 'email' | 'phone';

export default function LoginScreen({ navigation }: Props) {
  const { login, requestPhoneOTP, loginWithPhoneOTP } = useAuth();
  const { theme: t } = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  const [activeTab, setActiveTab] = useState<Tab>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [sentOtp, setSentOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const otpRefs = useRef<Array<TextInput | null>>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  function showError(title: string, message: string) {
    if (Platform.OS === 'web') {
      setErrorMsg(message);
    } else {
      Alert.alert(title, message);
    }
  }

  async function handleEmailLogin() {
    setErrorMsg('');
    if (!email.trim() || !password.trim()) {
      showError('Missing Fields', 'Please enter your email and password.');
      return;
    }
    hapticMedium();
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      showError('Login Failed', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOTP() {
    setErrorMsg('');
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) { showError('Invalid Phone', 'Please enter a valid 10-digit phone number.'); return; }
    setLoading(true);
    try {
      const code = await requestPhoneOTP(phone.trim());
      setSentOtp(code);
      setOtpSent(true);
      setOtp(['', '', '', '', '', '']);
      if (Platform.OS !== 'web') {
        Alert.alert('OTP Sent (Demo)', `Your OTP:\n\n${code}\n\n(In production this would be sent via SMS.)`);
      }
    } catch (e: any) {
      showError('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePhoneLogin() {
    setErrorMsg('');
    const entered = otp.join('');
    if (entered.length < 6) { showError('Incomplete', 'Please enter the 6-digit OTP.'); return; }
    hapticMedium();
    setLoading(true);
    try {
      await loginWithPhoneOTP(phone.trim(), entered, sentOtp);
    } catch (e: any) {
      showError('Login Failed', e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleOtpDigit(value: string, index: number) {
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
    else if (digit && index === 5) Keyboard.dismiss();
    if (!digit && index > 0) otpRefs.current[index - 1]?.focus();
  }

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    setOtpSent(false);
    setOtp(['', '', '', '', '', '']);
  }

  const Wrapper = Platform.OS === 'web' ? View : KeyboardAvoidingView;
  const wrapperProps = Platform.OS === 'web' ? {} : { behavior: Platform.OS === 'ios' ? 'padding' : undefined as any };

  return (
    <Wrapper style={s.flex} {...wrapperProps}>
      <ScrollView contentContainerStyle={[s.container, Platform.OS === 'web' && { minHeight: '100vh' as any }]} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <View style={s.logoCircle}>
            <Ionicons name="heart" size={36} color="#fff" />
          </View>
          <Text style={s.appName}>MedVault</Text>
          <Text style={s.tagline}>Your health records, always with you</Text>
        </View>

        <View style={s.tabRow}>
          <TouchableOpacity style={[s.tabBtn, activeTab === 'email' && s.tabBtnActive]} onPress={() => switchTab('email')}>
            <Ionicons name="mail-outline" size={15} color={activeTab === 'email' ? '#1565C0' : t.textMuted} />
            <Text style={[s.tabBtnText, activeTab === 'email' && s.tabBtnTextActive]}>Email</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tabBtn, activeTab === 'phone' && s.tabBtnActive]} onPress={() => switchTab('phone')}>
            <Ionicons name="phone-portrait-outline" size={15} color={activeTab === 'phone' ? '#1565C0' : t.textMuted} />
            <Text style={[s.tabBtnText, activeTab === 'phone' && s.tabBtnTextActive]}>Phone OTP</Text>
          </TouchableOpacity>
        </View>

        <View style={s.form}>
          {errorMsg ? <Text style={s.errorText}>{errorMsg}</Text> : null}
          {activeTab === 'email' ? (
            <>
              <Text style={s.label}>Email</Text>
              <TextInput style={s.input} placeholder="you@example.com" placeholderTextColor={t.textMuted} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={email} onChangeText={setEmail} />

              <Text style={s.label}>Password</Text>
              <View style={s.pwdRow}>
                <TextInput style={[s.input, { flex: 1, borderWidth: 0 }]} placeholder="Your password" placeholderTextColor={t.textMuted} secureTextEntry={!showPwd} value={password} onChangeText={setPassword} />
                <TouchableOpacity onPress={() => setShowPwd(v => !v)} style={s.eyeBtn}>
                  <Ionicons name={showPwd ? 'eye-off' : 'eye'} size={20} color={t.textMuted} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={s.forgotBtn} onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={s.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[s.button, loading && s.buttonDisabled]} onPress={handleEmailLogin} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Login</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={s.label}>Phone Number</Text>
              <View style={s.phoneRow}>
                <TextInput style={[s.input, { flex: 1 }]} placeholder="+91 98765 43210" placeholderTextColor={t.textMuted} keyboardType="phone-pad" value={phone} onChangeText={txt => { setPhone(txt); setOtpSent(false); }} editable={!otpSent} />
                {otpSent && (
                  <TouchableOpacity onPress={handleSendOTP} style={s.resendChip} disabled={loading}>
                    <Text style={s.resendChipText}>Resend</Text>
                  </TouchableOpacity>
                )}
              </View>

              {!otpSent ? (
                <TouchableOpacity style={[s.button, loading && s.buttonDisabled]} onPress={handleSendOTP} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Send OTP</Text>}
                </TouchableOpacity>
              ) : (
                <>
                  {Platform.OS === 'web' && sentOtp ? (
                    <View style={s.otpInlineBox}>
                      <Text style={s.otpInlineLabel}>YOUR OTP CODE</Text>
                      <Text style={s.otpInlineCode}>{sentOtp}</Text>
                      <Text style={s.otpInlineHint}>Enter this code in the boxes below</Text>
                    </View>
                  ) : null}
                  <Text style={[s.label, { marginTop: 18 }]}>Enter OTP</Text>
                  <View style={s.otpRow}>
                    {otp.map((d, i) => (
                      <TextInput
                        key={i}
                        ref={r => { otpRefs.current[i] = r; }}
                        style={[s.otpBox, d ? s.otpBoxFilled : null]}
                        value={d}
                        onChangeText={v => handleOtpDigit(v, i)}
                        onKeyPress={({ nativeEvent }) => { if (nativeEvent.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus(); }}
                        keyboardType="number-pad"
                        maxLength={1}
                        selectTextOnFocus
                        textAlign="center"
                      />
                    ))}
                  </View>
                  <TouchableOpacity style={[s.button, loading && s.buttonDisabled]} onPress={handlePhoneLogin} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Login with OTP</Text>}
                  </TouchableOpacity>
                </>
              )}
            </>
          )}

          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={s.linkText}>Don't have an account? <Text style={s.link}>Sign up</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Wrapper>
  );
}

const makeStyles = (t: AppTheme) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: Platform.OS === 'web' ? '#EEF2FF' : t.bg },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, ...(Platform.OS === 'web' && { maxWidth: 440, marginHorizontal: 'auto' as any, width: '100%', paddingTop: 48, paddingBottom: 48 }) },
  header: { alignItems: 'center', marginBottom: 28 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1565C0', alignItems: 'center', justifyContent: 'center', marginBottom: 12, elevation: 4, shadowColor: '#1565C0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  appName: { fontSize: 28, fontWeight: '700', color: '#1565C0', letterSpacing: 1 },
  tagline: { color: t.textSecondary, marginTop: 4, fontSize: 14 },
  tabRow: { flexDirection: 'row', backgroundColor: t.primaryLight, borderRadius: 12, padding: 4, marginBottom: 16, gap: 4 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
  tabBtnActive: { backgroundColor: t.surface, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: t.textMuted },
  tabBtnTextActive: { color: '#1565C0' },
  form: { backgroundColor: t.surface, borderRadius: 16, padding: 24, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
  label: { fontSize: 14, fontWeight: '600', color: t.text, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1.5, borderColor: t.border, borderRadius: 10, padding: 12, fontSize: 15, color: t.text, backgroundColor: t.inputBg },
  pwdRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: t.border, borderRadius: 10, backgroundColor: t.inputBg },
  eyeBtn: { padding: 12 },
  forgotBtn: { alignSelf: 'flex-end', marginTop: 8 },
  forgotText: { fontSize: 13, color: '#1565C0', fontWeight: '600' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resendChip: { backgroundColor: t.primaryLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  resendChipText: { color: '#1565C0', fontWeight: '700', fontSize: 13 },
  otpRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 16 },
  otpBox: { width: 44, height: 52, borderRadius: 10, borderWidth: 2, borderColor: t.border, fontSize: 20, fontWeight: '700', color: t.text, backgroundColor: t.inputBg },
  otpBoxFilled: { borderColor: '#1565C0', backgroundColor: t.primaryLight },
  button: { backgroundColor: '#1565C0', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 24, elevation: 2 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  linkText: { textAlign: 'center', marginTop: 20, color: t.textSecondary, fontSize: 14 },
  link: { color: '#1565C0', fontWeight: '600' },
  errorText: { color: '#C62828', fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 10 },
  otpInlineBox: { backgroundColor: '#1B5E20', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12, marginBottom: 4 },
  otpInlineLabel: { fontSize: 10, fontWeight: '700', color: '#A5D6A7', letterSpacing: 2, marginBottom: 4, textTransform: 'uppercase' },
  otpInlineCode: { fontSize: 36, fontWeight: '900', color: '#FFFFFF', letterSpacing: 8 },
  otpInlineHint: { fontSize: 11, color: '#C8E6C9', marginTop: 4 },
});
