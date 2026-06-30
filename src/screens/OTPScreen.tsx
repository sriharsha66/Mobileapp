import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { useTheme, AppTheme } from '../context/ThemeContext';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'OTP'>;
  route: RouteProp<AuthStackParamList, 'OTP'>;
};

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function OTPScreen({ navigation, route }: Props) {
  const { phone, name, email, password } = route.params;
  const { signup } = useAuth();
  const { theme: t } = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  // Generate once on mount, never changes
  const code = useRef(generateOTP()).current;
  const [sentOtp, setSentOtp] = useState(code);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [errorMsg, setErrorMsg] = useState('');
  const inputs = useRef<Array<TextInput | null>>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  function handleResend() {
    const newCode = generateOTP();
    setSentOtp(newCode);
    setResendTimer(30);
    setOtp(['', '', '', '', '', '']);
    setErrorMsg('');
    startTimer();
    inputs.current[0]?.focus();
  }

  function handleDigit(value: string, index: number) {
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) inputs.current[index + 1]?.focus();
    else if (digit && index === 5) Keyboard.dismiss();
    if (!digit && index > 0) inputs.current[index - 1]?.focus();
  }

  async function handleVerify() {
    const entered = otp.join('');
    if (entered.length < 6) { setErrorMsg('Please enter all 6 digits.'); return; }
    if (entered !== sentOtp) { setErrorMsg('Wrong code — use the number shown above.'); return; }
    setErrorMsg('');
    setLoading(true);
    try {
      await signup(name, email, password, phone, true);
    } catch (e: any) {
      setErrorMsg(e.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const maskedPhone = phone.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2');
  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 6)) + c);

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>

        {/* OTP code — shown ABOVE the card, full width, impossible to miss */}
        <View style={s.otpCodeBox}>
          <Text style={s.otpCodeLabel}>YOUR OTP CODE</Text>
          <Text style={s.otpCodeNumber}>{sentOtp}</Text>
          <Text style={s.otpCodeHint}>Type this code in the boxes below</Text>
        </View>

        <View style={s.card}>
          <Text style={s.icon}>🔐</Text>
          <Text style={s.title}>Verify Account</Text>
          <Text style={s.subtitle}>
            Code sent to{' '}
            <Text style={s.highlight}>{maskedPhone}</Text>
            {' '}·{' '}
            <Text style={s.highlight}>{maskedEmail}</Text>
          </Text>

          {errorMsg ? <Text style={s.errorText}>{errorMsg}</Text> : null}

          <View style={s.otpRow}>
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={ref => { inputs.current[i] = ref; }}
                style={[s.otpBox, digit ? s.otpBoxFilled : null]}
                value={digit}
                onChangeText={v => handleDigit(v, i)}
                onKeyPress={({ nativeEvent }) => { if (nativeEvent.key === 'Backspace' && !otp[i] && i > 0) inputs.current[i - 1]?.focus(); }}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                textAlign="center"
              />
            ))}
          </View>

          <TouchableOpacity style={[s.verifyBtn, loading && s.verifyBtnDisabled]} onPress={handleVerify} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.verifyBtnText}>Verify & Create Account</Text>}
          </TouchableOpacity>

          <View style={s.resendRow}>
            {resendTimer > 0
              ? <Text style={s.resendTimer}>Resend in {resendTimer}s</Text>
              : <TouchableOpacity onPress={handleResend}><Text style={s.resendLink}>Resend OTP</Text></TouchableOpacity>
            }
          </View>

          <TouchableOpacity onPress={() => navigation.goBack()} style={s.changeBtn}>
            <Text style={s.changeText}>← Change phone number</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t: AppTheme) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: t.bg },
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },

  // OTP code box — sits ABOVE the card, always the first thing seen
  otpCodeBox: {
    width: '100%',
    backgroundColor: '#1B5E20',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  otpCodeLabel: { fontSize: 11, fontWeight: '700', color: '#A5D6A7', letterSpacing: 2, marginBottom: 6, textTransform: 'uppercase' },
  otpCodeNumber: { fontSize: 44, fontWeight: '900', color: '#FFFFFF', letterSpacing: 10 },
  otpCodeHint: { fontSize: 12, color: '#C8E6C9', marginTop: 6 },

  card: { backgroundColor: t.surface, borderRadius: 20, padding: 24, width: '100%', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 10 },
  icon: { fontSize: 36, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: t.text, marginBottom: 6 },
  subtitle: { fontSize: 13, color: t.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  highlight: { color: '#1565C0', fontWeight: '700' },
  errorText: { color: '#C62828', fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 10, width: '100%' },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  otpBox: { width: 46, height: 54, borderRadius: 10, borderWidth: 2, borderColor: t.border, fontSize: 22, fontWeight: '700', color: t.text, backgroundColor: t.inputBg },
  otpBoxFilled: { borderColor: '#1565C0', backgroundColor: t.primaryLight },
  verifyBtn: { backgroundColor: '#1565C0', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, width: '100%', alignItems: 'center', elevation: 2 },
  verifyBtnDisabled: { opacity: 0.7 },
  verifyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  resendRow: { marginTop: 16 },
  resendTimer: { color: t.textMuted, fontSize: 13 },
  resendLink: { color: '#1565C0', fontSize: 13, fontWeight: '600' },
  changeBtn: { marginTop: 10 },
  changeText: { color: t.textMuted, fontSize: 13 },
});
