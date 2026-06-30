import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, Pressable, StyleSheet, ScrollView,
  Animated, Image, Alert, Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme, AppTheme } from '../context/ThemeContext';
import { Audio } from 'expo-av';

interface Props {
  onDone: () => void;
  isFirstLogin: boolean; // true = show avatar picker; false = show tap-to-enter only
}

const PRESETS = [
  { id: 'heart',          icon: 'heart',         color: '#E53935', bg: '#FFEBEE' },
  { id: 'medkit',         icon: 'medkit',        color: '#D81B60', bg: '#FCE4EC' },
  { id: 'leaf',           icon: 'leaf',          color: '#43A047', bg: '#E8F5E9' },
  { id: 'star',           icon: 'star',          color: '#FB8C00', bg: '#FFF3E0' },
  { id: 'moon',           icon: 'moon',          color: '#5E35B1', bg: '#EDE7F6' },
  { id: 'rocket',         icon: 'rocket',        color: '#039BE5', bg: '#E1F5FE' },
  { id: 'flower-outline', icon: 'flower-outline',color: '#00897B', bg: '#E0F2F1' },
  { id: 'sunny',          icon: 'sunny',         color: '#F4511E', bg: '#FBE9E7' },
] as const;

type PresetId = typeof PRESETS[number]['id'];

const PRESET_MAP = Object.fromEntries(PRESETS.map(p => [p.id, p])) as Record<PresetId, typeof PRESETS[number]>;

export default function WelcomeScreen({ onDone, isFirstLogin }: Props) {
  const { user, updateProfile } = useAuth();
  const { theme: t } = useTheme();
  const [selectedPreset, setSelectedPreset] = useState<PresetId | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoEditing, setPhotoEditing] = useState(false); // show edit bar after capture

  // Ripple ring around big avatar (tap hint)
  const ringScale   = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.5)).current;
  // Avatar press shrink
  const avatarPress = useRef(new Animated.Value(1)).current;
  // Preset scale animations
  const presetScales = useRef(PRESETS.map(() => new Animated.Value(1))).current;
  // Hand wave
  const waveAnim = useRef(new Animated.Value(0)).current;
  // Entrance fade-in
  const screenOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slow fade-in on mount (matches splash exit fade)
    Animated.timing(screenOpacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Ripple loop
    function doRipple() {
      ringScale.setValue(1);
      ringOpacity.setValue(0.5);
      Animated.parallel([
        Animated.timing(ringScale,   { toValue: 1.65, duration: 1100, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 0,    duration: 1100, useNativeDriver: true }),
      ]).start(() => setTimeout(doRipple, 400));
    }
    doRipple();

    // Hand wave: plays once on mount (5 swings then rests)
    Animated.sequence([
      Animated.timing(waveAnim, { toValue: 1,     duration: 160, useNativeDriver: true }),
      Animated.timing(waveAnim, { toValue: -0.35, duration: 130, useNativeDriver: true }),
      Animated.timing(waveAnim, { toValue: 1,     duration: 130, useNativeDriver: true }),
      Animated.timing(waveAnim, { toValue: -0.35, duration: 130, useNativeDriver: true }),
      Animated.timing(waveAnim, { toValue: 1,     duration: 130, useNativeDriver: true }),
      Animated.timing(waveAnim, { toValue: 0,     duration: 160, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Preset select / deselect ──
  function togglePreset(id: PresetId, index: number) {
    setPhotoUri(null);
    const isDeselect = selectedPreset === id;
    setSelectedPreset(isDeselect ? null : id);
    Animated.spring(presetScales[index], {
      toValue: isDeselect ? 0.9 : 1.18,
      friction: 5, tension: 120, useNativeDriver: true,
    }).start(() =>
      Animated.spring(presetScales[index], { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start()
    );
  }

  async function pickFromGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow photo library access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets[0]) { setPhotoUri(result.assets[0].uri); setSelectedPreset(null); setPhotoEditing(true); }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow camera access.'); return; }
    const result = await ImagePicker.launchCameraAsync({ cameraType: ImagePicker.CameraType.front, allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setSelectedPreset(null);
      setPhotoEditing(true); // show edit toolbar
    }
  }

  async function applyPhotoTransform(action: 'mirror' | 'rotateLeft' | 'rotateRight') {
    if (!photoUri) return;
    const actions =
      action === 'mirror'      ? [{ flip: ImageManipulator.FlipType.Horizontal }] :
      action === 'rotateLeft'  ? [{ rotate: -90 }] :
                                 [{ rotate: 90 }];
    const result = await ImageManipulator.manipulateAsync(
      photoUri, actions as any,
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
    );
    setPhotoUri(result.uri);
  }

  // ── Tap big avatar → save + enter ──
  async function handleAvatarTap() {
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/ding.mp3'),
        { shouldPlay: true, volume: 1.0 }
      );
      sound.setOnPlaybackStatusUpdate((st) => {
        if (st.isLoaded && st.didJustFinish) sound.unloadAsync();
      });
    } catch {}
    Animated.sequence([
      Animated.timing(avatarPress, { toValue: 0.88, duration: 100, useNativeDriver: true }),
      Animated.timing(avatarPress, { toValue: 1,    duration: 150, useNativeDriver: true }),
    ]).start(async () => {
      if (isFirstLogin) {
        try {
          if (photoUri) await updateProfile({ avatar: photoUri });
          else if (selectedPreset) await updateProfile({ avatar: `preset:${selectedPreset}` });
        } catch {}
      }
      onDone();
    });
  }

  const firstName = (user?.name || 'there').split(' ')[0];

  // Resolve what the big avatar should display
  function BigAvatar() {
    // For first login: show what's selected (or placeholder)
    if (isFirstLogin) {
      if (photoUri) {
        return <Image source={{ uri: photoUri }} style={s.bigPhoto} />;
      }
      if (selectedPreset) {
        const p = PRESET_MAP[selectedPreset];
        return (
          <View style={[s.bigCircle, { backgroundColor: p.bg, borderColor: p.color }]}>
            <Ionicons name={p.icon as any} size={80} color={p.color} />
          </View>
        );
      }
      return (
        <View style={[s.bigCircle, s.bigPlaceholder]}>
          <Ionicons name="person-outline" size={72} color="#BDBDBD" />
        </View>
      );
    }

    // For subsequent login: show saved avatar
    const av = user?.avatar;
    if (av?.startsWith('preset:')) {
      const icon = av.replace('preset:', '') as PresetId;
      const p = PRESET_MAP[icon];
      if (p) return (
        <View style={[s.bigCircle, { backgroundColor: p.bg, borderColor: p.color }]}>
          <Ionicons name={p.icon as any} size={80} color={p.color} />
        </View>
      );
    }
    if (av) return <Image source={{ uri: av }} style={s.bigPhoto} />;

    // Fallback: initials
    const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    return (
      <View style={[s.bigCircle, { backgroundColor: '#1565C0', borderColor: '#1565C0' }]}>
        <Text style={s.bigInitials}>{initials}</Text>
      </View>
    );
  }

  const tapHint = isFirstLogin
    ? (photoUri || selectedPreset ? 'Tap your avatar to enter →' : 'Pick an avatar or tap to skip →')
    : 'Tap to enter →';

  const waveRotate = waveAnim.interpolate({
    inputRange: [-0.35, 0, 1],
    outputRange: ['-12deg', '0deg', '30deg'],
  });

  const s = makeStyles(t);
  return (
    <Animated.View style={{ flex: 1, opacity: screenOpacity }}>

    {/* Photo edit modal — full-screen bottom-sheet after selfie/gallery pick */}
    <Modal
      visible={photoEditing && !!photoUri}
      transparent
      animationType="slide"
      onRequestClose={() => { setPhotoUri(null); setPhotoEditing(false); }}
    >
      <View style={s.editModalBg}>
        <View style={s.editModalCard}>
          <Text style={s.editModalTitle}>Adjust Photo</Text>
          {photoUri && (
            <Image key={photoUri} source={{ uri: photoUri }} style={s.editModalImg} resizeMode="contain" />
          )}
          <View style={s.editModalBtns}>
            <TouchableOpacity style={s.editModalBtn} onPress={() => applyPhotoTransform('rotateLeft')}>
              <Ionicons name="refresh" size={22} color="#1565C0" style={{ transform: [{ scaleX: -1 }] }} />
              <Text style={s.editModalBtnTxt}>Rotate ↺</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.editModalBtn} onPress={() => applyPhotoTransform('mirror')}>
              <Ionicons name="swap-horizontal" size={22} color="#1565C0" />
              <Text style={s.editModalBtnTxt}>Mirror</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.editModalBtn} onPress={() => applyPhotoTransform('rotateRight')}>
              <Ionicons name="refresh" size={22} color="#1565C0" />
              <Text style={s.editModalBtnTxt}>Rotate ↻</Text>
            </TouchableOpacity>
          </View>
          <View style={s.editModalActions}>
            <TouchableOpacity style={s.editModalCancel} onPress={() => { setPhotoUri(null); setPhotoEditing(false); }}>
              <Text style={s.editModalCancelTxt}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.editModalConfirm} onPress={() => setPhotoEditing(false)}>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={s.editModalConfirmTxt}>Use Photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    <ScrollView
      contentContainerStyle={[s.container, !isFirstLogin && s.containerCentered]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Greeting */}
      <View style={s.greeting}>
        <View style={s.hiRow}>
          <Animated.Text style={[s.waveEmoji, { transform: [{ rotate: waveRotate }] }]}>👋</Animated.Text>
          <Text style={s.hi}>{isFirstLogin ? ' Hello,' : ' Welcome back,'}</Text>
        </View>
        <Text style={s.name}>{firstName}!</Text>
        {isFirstLogin && <Text style={s.sub}>Pick your avatar to get started</Text>}
      </View>

      {/* Big tappable avatar with ripple ring */}
      <Pressable
        onPress={handleAvatarTap}
        style={s.bigAvatarWrap}
      >
        {/* Ripple ring */}
        <Animated.View style={[s.ring, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />

        {/* Avatar */}
        <Animated.View style={{ transform: [{ scale: avatarPress }] }}>
          <BigAvatar />
        </Animated.View>
      </Pressable>

      <Text style={s.tapHint}>{tapHint}</Text>

      {/* ── First login only: avatar picker ── */}
      {isFirstLogin && (
        <>
          <Text style={s.sectionLabel}>Choose an avatar</Text>
          <View style={s.grid}>
            {PRESETS.map((p, i) => {
              const active = selectedPreset === p.id;
              return (
                <Animated.View key={p.id} style={{ transform: [{ scale: presetScales[i] }] }}>
                  <TouchableOpacity
                    style={[s.preset, { backgroundColor: p.bg }, active && { borderColor: p.color, borderWidth: 3 }]}
                    onPress={() => togglePreset(p.id, i)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={p.icon as any} size={32} color={p.color} />
                    {active && (
                      <View style={[s.activeTick, { backgroundColor: p.color }]}>
                        <Ionicons name="checkmark" size={9} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>

          <Text style={s.sectionLabel}>Or use your photo</Text>
          <View style={s.photoRow}>
            <TouchableOpacity style={s.photoBtn} onPress={takePhoto} activeOpacity={0.85}>
              <View style={[s.photoBtnIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="camera" size={24} color="#1565C0" />
              </View>
              <Text style={s.photoBtnText}>Take Selfie</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.photoBtn} onPress={pickFromGallery} activeOpacity={0.85}>
              <View style={[s.photoBtnIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="images" size={24} color="#43A047" />
              </View>
              <Text style={s.photoBtnText}>Gallery</Text>
            </TouchableOpacity>
            {photoUri ? (
              <TouchableOpacity style={s.photoBtn} onPress={() => { setPhotoUri(null); setPhotoEditing(false); }} activeOpacity={0.85}>
                <View style={[s.photoBtnIcon, { backgroundColor: '#FFEBEE' }]}>
                  <Ionicons name="trash-outline" size={24} color="#EF5350" />
                </View>
                <Text style={[s.photoBtnText, { color: '#EF5350' }]}>Remove</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </>
      )}
    </ScrollView>
    </Animated.View>
  );
}

const BIG = 140;
const RING = BIG + 32;

const makeStyles = (t: AppTheme) => StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: t.bg, padding: 24, paddingBottom: 48 },
  containerCentered: { justifyContent: 'center' },

  greeting: { alignItems: 'center', paddingTop: 36, marginBottom: 20 },
  hiRow: { flexDirection: 'row', alignItems: 'center' },
  waveEmoji: { fontSize: 28 },
  hi:          { fontSize: 22, color: t.textSecondary, fontWeight: '500' },
  welcomeBack: { fontSize: 22, color: t.textSecondary, fontWeight: '500' },
  name: { fontSize: 42, fontWeight: '900', color: '#1565C0', letterSpacing: 1, lineHeight: 50 },
  sub:  { fontSize: 14, color: t.textMuted, marginTop: 6 },

  bigAvatarWrap: { alignSelf: 'center', width: RING, height: RING, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  ring: {
    position: 'absolute',
    width: RING, height: RING, borderRadius: RING / 2,
    borderWidth: 2.5, borderColor: '#1565C0',
  },
  bigCircle: {
    width: BIG, height: BIG, borderRadius: BIG / 2,
    borderWidth: 3, alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10,
  },
  bigPlaceholder: { backgroundColor: t.border, borderColor: t.border, borderStyle: 'dashed' },
  bigPhoto: { width: BIG, height: BIG, borderRadius: BIG / 2, borderWidth: 3, borderColor: '#1565C0' },
  bigInitials: { fontSize: 48, fontWeight: '700', color: '#fff' },

  editModalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  editModalCard: { backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  editModalTitle: { fontSize: 17, fontWeight: '700', color: t.text, textAlign: 'center', marginBottom: 16 },
  editModalImg: { width: '100%', height: 240, borderRadius: 16, backgroundColor: t.inputBg, marginBottom: 16 } as any,
  editModalBtns: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 20 },
  editModalBtn: { alignItems: 'center', backgroundColor: t.primaryLight, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, gap: 4, minWidth: 80 },
  editModalBtnTxt: { fontSize: 12, fontWeight: '700', color: '#1565C0' },
  editModalActions: { flexDirection: 'row', gap: 12 },
  editModalCancel: { flex: 1, borderRadius: 14, borderWidth: 1.5, borderColor: t.border, padding: 13, alignItems: 'center' },
  editModalCancelTxt: { fontSize: 15, fontWeight: '600', color: t.textSecondary },
  editModalConfirm: { flex: 2, flexDirection: 'row', backgroundColor: '#1565C0', borderRadius: 14, padding: 13, alignItems: 'center', justifyContent: 'center', gap: 6 },
  editModalConfirmTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
  tapHint: { textAlign: 'center', fontSize: 13, color: '#1565C0', fontWeight: '600', marginBottom: 32, letterSpacing: 0.3 },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: t.text, marginBottom: 12, letterSpacing: 0.4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24, justifyContent: 'center' },
  preset: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  activeTick: { position: 'absolute', bottom: 3, right: 3, width: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' },

  photoRow: { flexDirection: 'row', gap: 12 },
  photoBtn: { flex: 1, backgroundColor: t.surface, borderRadius: 16, padding: 16, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
  photoBtnIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  photoBtnText: { fontSize: 13, fontWeight: '700', color: t.text },
});
