import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
  Animated, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useBiometric } from '../context/BiometricContext';

export default function AppLockScreen() {
  const { authenticate } = useBiometric();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();
    // Auto-prompt on mount
    authenticate();
  }, []);

  async function getAuthIcon() {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const hasFace = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    return hasFace ? 'scan' : 'finger-print';
  }

  const [icon, setIcon] = React.useState<'scan' | 'finger-print'>('finger-print');
  useEffect(() => {
    getAuthIcon().then(setIcon);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D47A1" />
      <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.logoRow}>
          <Ionicons name="shield-checkmark" size={40} color="#1565C0" />
          <Text style={styles.appName}>MedVault</Text>
        </View>
        <Text style={styles.subtitle}>Your health records are locked</Text>

        <TouchableOpacity style={styles.unlockBtn} onPress={authenticate} activeOpacity={0.8}>
          <Ionicons name={icon} size={26} color="#fff" />
          <Text style={styles.unlockText}>
            {Platform.OS === 'ios' ? 'Unlock with Face ID / Touch ID' : 'Unlock with Fingerprint / Face'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          {Platform.OS === 'ios'
            ? 'Use your device passcode if biometrics fail'
            : 'Use your device PIN if biometrics fail'}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0D47A1',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 44,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '85%',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1565C0',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 36,
    textAlign: 'center',
  },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1565C0',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    marginBottom: 20,
  },
  unlockText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  hint: {
    fontSize: 12,
    color: '#BDBDBD',
    textAlign: 'center',
    lineHeight: 18,
  },
});
