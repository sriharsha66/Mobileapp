import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';

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

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [sentOtp, setSentOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const inputs = useRef<Array<TextInput | null>>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    sendOTP();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function sendOTP() {
    const code = generateOTP();
    setSentOtp(code);
    setResendTimer(30);
    startTimer();
    setTimeout(() => {
      Alert.alert(
        '✅ Verification Sent (Demo)',
        `We have sent a 6-digit OTP to:\n\n📱 Phone: ${phone}\n📧 Email: ${email}\n\nYour demo code is:\n\n${code}\n\n(In production, real SMS and email would be delivered.)`,
        [{ text: 'Got it' }]
      );
    }, 400);
  }

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  function handleDigit(value: string, index: number) {
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) {
      inputs.current[index + 1]?.focus();
    } else if (digit && index === 5) {
      // Last digit — dismiss keyboard so verify button is visible
      Keyboard.dismiss();
    }
    if (!digit && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  function handleKeyPress(key: string, index: number) {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  async function handleVerify() {
    const entered = otp.join('');
    if (entered.length < 6) { Alert.alert('Incomplete', 'Please enter the 6-digit OTP.'); return; }
    if (entered !== sentOtp) { Alert.alert('Wrong OTP', 'The code you entered is incorrect. Please try again.'); return; }
    setLoading(true);
    try {
      await signup(name, email, password, phone, true);
    } catch (e: any) {
      Alert.alert('Signup Failed', e.message);
    } finally {
      setLoading(false);
    }
  }

  const maskedPhone = phone.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2');
  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 6)) + c);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.card}>
          <Text style={styles.icon}>🔐</Text>
          <Text style={styles.title}>Verify Account</Text>
          <Text style={styles.subtitle}>
            A 6-digit code was sent to{'\n'}
            <Text style={styles.highlight}>{maskedPhone}</Text>
            {' '}and{' '}
            <Text style={styles.highlight}>{maskedEmail}</Text>
          </Text>

          {/* OTP boxes */}
          <View style={styles.otpRow}>
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={(ref) => { inputs.current[i] = ref; }}
                style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                value={digit}
                onChangeText={(v) => handleDigit(v, i)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                textAlign="center"
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.verifyBtn, loading && styles.verifyBtnDisabled]}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.verifyBtnText}>Verify & Create Account</Text>}
          </TouchableOpacity>

          <View style={styles.resendRow}>
            {resendTimer > 0 ? (
              <Text style={styles.resendTimer}>Resend OTP in {resendTimer}s</Text>
            ) : (
              <TouchableOpacity onPress={sendOTP}>
                <Text style={styles.resendLink}>Resend OTP</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.changeBtn}>
            <Text style={styles.changeText}>Change phone number</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F8FAFE' },
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  icon: { fontSize: 44, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#212121', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#757575', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  highlight: { color: '#1565C0', fontWeight: '700' },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  otpBox: {
    width: 46,
    height: 54,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    fontSize: 22,
    fontWeight: '700',
    color: '#212121',
    backgroundColor: '#FAFAFA',
  },
  otpBoxFilled: { borderColor: '#1565C0', backgroundColor: '#E3F2FD' },
  verifyBtn: {
    backgroundColor: '#1565C0',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    elevation: 2,
  },
  verifyBtnDisabled: { opacity: 0.7 },
  verifyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  resendRow: { marginTop: 20 },
  resendTimer: { color: '#9E9E9E', fontSize: 13 },
  resendLink: { color: '#1565C0', fontSize: 13, fontWeight: '600' },
  changeBtn: { marginTop: 12 },
  changeText: { color: '#9E9E9E', fontSize: 13 },
});
