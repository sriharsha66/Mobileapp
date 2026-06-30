import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';

interface Props { onDone: () => void }

export default function SplashAnimationScreen({ onDone }: Props) {
  const player = useAudioPlayer(require('../../assets/sounds/heartbeat.mp3'));

  // Logo
  const logoScale    = useRef(new Animated.Value(0.06)).current;
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  // Red background flash
  const flashOpacity = useRef(new Animated.Value(0)).current;
  // Blue glow
  const glowScale    = useRef(new Animated.Value(0.3)).current;
  const glowOpacity  = useRef(new Animated.Value(0)).current;
  // Tagline
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY       = useRef(new Animated.Value(12)).current;
  // Heart pulse
  const heartScale = useRef(new Animated.Value(1)).current;
  // Whole-screen exit fade
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // ── Play heartbeat sound ──
    (async () => {
      try {
        await setAudioModeAsync({ playsInSilentMode: true });
        player.play();
      } catch {}
    })();

    // ── Phase 1 (0–600ms): logo slams in with overshoot ──
    Animated.timing(logoScale, {
      toValue: 1.18,
      duration: 550,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      // Red flash at peak
      Animated.sequence([
        Animated.timing(flashOpacity, { toValue: 0.18, duration: 80,  useNativeDriver: true }),
        Animated.timing(flashOpacity, { toValue: 0,    duration: 280, useNativeDriver: true }),
      ]).start();

      // Settle to 1.0
      Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
    });

    Animated.timing(logoOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    Animated.parallel([
      Animated.timing(glowScale,   { toValue: 1,    duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(glowOpacity, { toValue: 0.55, duration: 700, useNativeDriver: true }),
    ]).start();

    // ── Phase 2 (600ms): tagline slides up ──
    const tagTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(taglineOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(taglineY,       { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
    }, 600);

    // ── Heart double-beat loop ──
    function doPulse() {
      Animated.sequence([
        Animated.timing(heartScale, { toValue: 1.5,  duration: 160, useNativeDriver: true }),
        Animated.timing(heartScale, { toValue: 1.0,  duration: 160, useNativeDriver: true }),
        Animated.timing(heartScale, { toValue: 1.28, duration: 120, useNativeDriver: true }),
        Animated.timing(heartScale, { toValue: 1.0,  duration: 200, useNativeDriver: true }),
      ]).start(() => setTimeout(doPulse, 650));
    }
    doPulse();

    // ── Phase 3 (2400ms): slow fade out before handing off ──
    const fadeTimer = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 700,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start();
    }, 2400);

    const doneTimer = setTimeout(() => {
      try { player.pause(); } catch {}
      onDone();
    }, 3100);

    return () => {
      clearTimeout(tagTimer);
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
      try { player.remove(); } catch {}
    };
  }, []);

  return (
    <Animated.View style={[s.bg, { opacity: screenOpacity }]}>
      <Animated.View style={[s.flash, { opacity: flashOpacity }]} />
      <Animated.View style={[s.glow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />

      <Animated.View style={[s.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <View style={s.iconCircle}>
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Ionicons name="heart" size={56} color="#E53935" />
          </Animated.View>
        </View>
        <Text style={s.appName}>MedVault</Text>
      </Animated.View>

      <Animated.Text style={[s.tagline, { opacity: taglineOpacity, transform: [{ translateY: taglineY }] }]}>
        Your health records, always with you
      </Animated.Text>

      <Text style={s.version}>v1.0.1</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  bg:      { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  flash:   { ...StyleSheet.absoluteFillObject, backgroundColor: '#E53935' },
  glow:    { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: '#1565C0' },
  logoWrap:  { alignItems: 'center' },
  iconCircle: {
    width: 136, height: 136, borderRadius: 68,
    backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#E53935', marginBottom: 28,
    shadowColor: '#E53935', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9, shadowRadius: 28, elevation: 16,
  },
  appName:  { fontSize: 42, fontWeight: '900', color: '#FFFFFF', letterSpacing: 6 },
  tagline:  { position: 'absolute', bottom: 120, fontSize: 13, color: '#616161', letterSpacing: 0.6 },
  version:  { position: 'absolute', bottom: 48, fontSize: 11, color: '#333', letterSpacing: 1 },
});
