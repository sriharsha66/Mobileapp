import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Image, Modal, StatusBar, Switch, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as LegacyFS from 'expo-file-system/legacy';
import { useAuth } from '../context/AuthContext';
import { useTheme, AppTheme } from '../context/ThemeContext';
import { useBiometric } from '../context/BiometricContext';
import { ALL_QUOTES, quoteFavKey } from '../constants/quotes';
import { STARRED_KEY } from './StarredReportsScreen';
import { hapticMedium } from '../utils/haptics';

const PRESET_COLORS: Record<string, { color: string; bg: string }> = {
  heart:   { color: '#E53935', bg: '#FFEBEE' },
  medkit:  { color: '#D81B60', bg: '#FCE4EC' },
  leaf:    { color: '#43A047', bg: '#E8F5E9' },
  star:    { color: '#FB8C00', bg: '#FFF3E0' },
  moon:    { color: '#5E35B1', bg: '#EDE7F6' },
  rocket:  { color: '#039BE5', bg: '#E1F5FE' },
  'flower-outline': { color: '#00897B', bg: '#E0F2F1' },
  sunny:   { color: '#F4511E', bg: '#FBE9E7' },
};

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function ProfileScreen({ navigation }: { navigation: any }) {
  const { user, logout, updateProfile } = useAuth();
  const { theme: t, isDark, toggleTheme } = useTheme();
  const { isEnabled: biometricEnabled, isSupported: biometricSupported, toggleEnabled: toggleBiometric } = useBiometric();
  const scrollRef = useRef<ScrollView>(null);
  const [editing, setEditing] = useState(false);
  const [viewingAvatar, setViewingAvatar] = useState(false);
  const [pendingUri, setPendingUri] = useState<string | null>(null); // selfie waiting for edit/confirm
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [dob, setDob] = useState(user?.dateOfBirth || '');
  const [blood, setBlood] = useState(user?.bloodGroup || '');
  const [saving, setSaving] = useState(false);
  const [favIds, setFavIds] = useState<string[]>([]);
  const [starredCount, setStarredCount] = useState(0);

  const s = useMemo(() => makeStyles(t), [t]);

  const loadFavs = useCallback(async () => {
    const [quotesJson, starredJson] = await Promise.all([
      user ? AsyncStorage.getItem(quoteFavKey(user.id)) : Promise.resolve(null),
      user ? AsyncStorage.getItem(STARRED_KEY(user.id)) : Promise.resolve(null),
    ]);
    setFavIds(quotesJson ? JSON.parse(quotesJson) : []);
    setStarredCount(starredJson ? JSON.parse(starredJson).length : 0);
  }, [user]);

  useFocusEffect(useCallback(() => {
    loadFavs();
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [loadFavs]));

  async function handleSave() {
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim(), dateOfBirth: dob.trim(), bloodGroup: blood });
      setEditing(false);
    } catch {
      Alert.alert('Error', 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    if (Platform.OS === 'web') {
      if ((window as any).confirm('Are you sure you want to logout?')) logout();
      return;
    }
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Stay', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  }

  const initials = (user?.name || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const savedQuotes = ALL_QUOTES.filter(q => favIds.includes(q.id));

  async function changeAvatar() {
    const hasPhoto = !!(user?.avatar && !user.avatar.startsWith('preset:'));
    const options: any[] = [
      {
        text: 'Take Selfie', onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') { Alert.alert('Permission needed', 'Camera access required.'); return; }
          const r = await ImagePicker.launchCameraAsync({ cameraType: ImagePicker.CameraType.front, allowsEditing: true, aspect: [1, 1], quality: 0.85 });
          if (!r.canceled && r.assets[0]) {
            setPendingUri(r.assets[0].uri); // open edit modal
          }
        },
      },
      {
        text: 'Choose from Gallery', onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') { Alert.alert('Permission needed', 'Photo library access required.'); return; }
          const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
          if (!r.canceled && r.assets[0]) setPendingUri(r.assets[0].uri);
        },
      },
    ];
    if (hasPhoto) {
      options.push({
        text: 'Remove Photo',
        style: 'destructive' as const,
        onPress: () => updateProfile({ avatar: undefined }),
      });
    }
    options.push({ text: 'Cancel', style: 'cancel' as const });
    Alert.alert('Change Avatar', 'Choose an option', options);
  }

  function handleAvatarTap() {
    const av = user?.avatar;
    if (av && !av.startsWith('preset:')) {
      setViewingAvatar(true);
    } else {
      changeAvatar();
    }
  }

  function renderAvatar(size = 84) {
    const r = size / 2;
    const av = user?.avatar;
    if (av && av.startsWith('preset:')) {
      const icon = av.replace('preset:', '');
      const pc = PRESET_COLORS[icon] || { color: '#1565C0', bg: t.primaryLight };
      return (
        <View style={[s.avatar, { width: size, height: size, borderRadius: r, backgroundColor: pc.bg }]}>
          <Ionicons name={icon as any} size={size * 0.45} color={pc.color} />
        </View>
      );
    }
    if (av) {
      return <Image source={{ uri: av }} style={[s.avatar, { width: size, height: size, borderRadius: r, borderWidth: 2, borderColor: '#1565C0' }]} />;
    }
    return (
      <View style={[s.avatar, { width: size, height: size, borderRadius: r }]}>
        <Text style={[s.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
      </View>
    );
  }

  const isPhotoAvatar = user?.avatar && !user.avatar.startsWith('preset:');

  return (
    <View style={s.container}>
      <StatusBar barStyle={t.statusBar} />

      {/* Photo edit modal — appears after selfie/gallery pick */}
      <Modal visible={!!pendingUri} transparent animationType="slide" onRequestClose={() => setPendingUri(null)}>
        <View style={s.editModalBg}>
          <View style={s.editModalCard}>
            <Text style={s.editModalTitle}>Adjust Photo</Text>
            {pendingUri && (
              <Image key={pendingUri} source={{ uri: pendingUri }} style={s.editModalImg} resizeMode="contain" />
            )}
            <View style={s.editModalBtns}>
              <TouchableOpacity style={s.editModalBtn} onPress={async () => {
                if (!pendingUri) return;
                const r = await ImageManipulator.manipulateAsync(pendingUri, [{ rotate: -90 }] as any, { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG });
                setPendingUri(r.uri);
              }}>
                <Ionicons name="refresh" size={22} color="#1565C0" style={{ transform: [{ scaleX: -1 }] }} />
                <Text style={s.editModalBtnTxt}>Rotate ↺</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.editModalBtn} onPress={async () => {
                if (!pendingUri) return;
                const r = await ImageManipulator.manipulateAsync(pendingUri, [{ flip: ImageManipulator.FlipType.Horizontal }] as any, { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG });
                setPendingUri(r.uri);
              }}>
                <Ionicons name="swap-horizontal" size={22} color="#1565C0" />
                <Text style={s.editModalBtnTxt}>Mirror</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.editModalBtn} onPress={async () => {
                if (!pendingUri) return;
                const r = await ImageManipulator.manipulateAsync(pendingUri, [{ rotate: 90 }] as any, { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG });
                setPendingUri(r.uri);
              }}>
                <Ionicons name="refresh" size={22} color="#1565C0" />
                <Text style={s.editModalBtnTxt}>Rotate ↻</Text>
              </TouchableOpacity>
            </View>
            <View style={s.editModalActions}>
              <TouchableOpacity style={s.editModalCancel} onPress={() => setPendingUri(null)}>
                <Text style={s.editModalCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.editModalConfirm} onPress={async () => {
                if (pendingUri) {
                  // Convert file:// URI → base64 data URI so the avatar
                  // isn't a device-local path that breaks after cache clears.
                  const b64 = await LegacyFS.readAsStringAsync(pendingUri, {
                    encoding: LegacyFS.EncodingType.Base64,
                  });
                  await updateProfile({ avatar: `data:image/jpeg;base64,${b64}` });
                }
                setPendingUri(null);
              }}>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={s.editModalConfirmTxt}>Use Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full-screen image viewer modal */}
      <Modal visible={viewingAvatar} transparent animationType="fade" onRequestClose={() => setViewingAvatar(false)}>
        <StatusBar backgroundColor="#000" barStyle="light-content" />
        <View style={s.modalBg}>
          {isPhotoAvatar && (
            <Image source={{ uri: user!.avatar! }} style={s.modalImage} resizeMode="contain" />
          )}
          <TouchableOpacity style={s.modalClose} onPress={() => setViewingAvatar(false)}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={s.modalActions}>
            <TouchableOpacity
              style={s.modalChangeBtn}
              onPress={() => { setViewingAvatar(false); setTimeout(changeAvatar, 300); }}
            >
              <Ionicons name="camera-outline" size={18} color="#fff" />
              <Text style={s.modalChangeTxt}>Change Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.modalRemoveBtn}
              onPress={() => { setViewingAvatar(false); updateProfile({ avatar: undefined }); }}
            >
              <Ionicons name="trash-outline" size={18} color="#EF5350" />
              <Text style={s.modalRemoveTxt}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView ref={scrollRef} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* Avatar */}
      <View style={s.avatarSection}>
        <TouchableOpacity onPress={handleAvatarTap} activeOpacity={0.85} style={s.avatarWrap}>
          {renderAvatar(84)}
          <View style={s.editBadge}>
            <Ionicons name={isPhotoAvatar ? 'eye' : 'camera'} size={13} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={s.displayName}>{user?.name}</Text>
        <Text style={s.displayEmail}>{user?.email}</Text>
      </View>

      {/* Personal info card */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>Personal Info</Text>
          {!editing && (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={s.editLink}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {editing ? (
          <>
            <FieldC label="Full Name" value={name} onChangeText={setName} t={t} />
            <FieldC label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" t={t} />
            <FieldC label="Date of Birth (YYYY-MM-DD)" value={dob} onChangeText={setDob} t={t} />
            <Text style={s.fieldLabel}>Blood Group</Text>
            <View style={s.bloodRow}>
              {BLOOD_GROUPS.map(bg => (
                <TouchableOpacity
                  key={bg}
                  style={[s.bloodChip, blood === bg && s.bloodChipActive]}
                  onPress={() => setBlood(bg)}
                >
                  <Text style={[s.bloodChipText, blood === bg && s.bloodChipTextActive]}>{bg}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.editActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => {
                setEditing(false);
                setName(user?.name || '');
                setPhone(user?.phone || '');
                setDob(user?.dateOfBirth || '');
                setBlood(user?.bloodGroup || '');
              }}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <InfoRowC label="Phone" value={user?.phone || '—'} t={t} />
            <InfoRowC label="Date of Birth" value={user?.dateOfBirth || '—'} t={t} />
            <InfoRowC label="Blood Group" value={user?.bloodGroup || '—'} highlight t={t} />
          </>
        )}
      </View>

      {/* Starred Reports */}
      <TouchableOpacity style={s.navRow} onPress={() => navigation.navigate('StarredReports')} activeOpacity={0.85}>
        <View style={s.navRowLeft}>
          <View style={[s.navIcon, { backgroundColor: '#FFF8E1' }]}>
            <Ionicons name="star" size={20} color="#FB8C00" />
          </View>
          <View>
            <Text style={s.navTitle}>Starred Reports</Text>
            <Text style={s.navSub}>
              {starredCount === 0 ? 'No starred reports yet' : `${starredCount} report${starredCount !== 1 ? 's' : ''} starred`}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={t.textMuted} />
      </TouchableOpacity>

      {/* Saved Quotes */}
      <TouchableOpacity style={s.navRow} onPress={() => navigation.navigate('SavedQuotes')} activeOpacity={0.85}>
        <View style={s.navRowLeft}>
          <View style={[s.navIcon, { backgroundColor: '#FFEBEE' }]}>
            <Ionicons name="heart" size={20} color="#E53935" />
          </View>
          <View>
            <Text style={s.navTitle}>Saved Quotes</Text>
            <Text style={s.navSub}>
              {savedQuotes.length === 0 ? 'No saved quotes yet' : `${savedQuotes.length} quote${savedQuotes.length !== 1 ? 's' : ''} saved`}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={t.textMuted} />
      </TouchableOpacity>

      {/* Dark mode toggle */}
      <View style={s.navRow}>
        <View style={s.navRowLeft}>
          <View style={[s.navIcon, { backgroundColor: isDark ? '#2C2C2C' : '#E8EAF6' }]}>
            <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={isDark ? '#7986CB' : '#FB8C00'} />
          </View>
          <View>
            <Text style={s.navTitle}>{isDark ? 'Dark Mode' : 'Light Mode'}</Text>
            <Text style={s.navSub}>Tap to switch theme</Text>
          </View>
        </View>
        <Switch
          value={isDark}
          onValueChange={() => { hapticMedium(); toggleTheme(); }}
          trackColor={{ false: '#E0E0E0', true: '#1565C0' }}
          thumbColor="#fff"
        />
      </View>

      {/* App Lock toggle — temporarily hidden */}

      {/* Logout */}
      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color="#EF5350" style={{ marginRight: 6 }} />
        <Text style={s.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={s.version}>MedVault v1.0.1</Text>
      </ScrollView>
    </View>
  );
}

function InfoRowC({ label, value, highlight, t }: { label: string; value: string; highlight?: boolean; t: AppTheme }) {
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={[s.infoValue, highlight && { color: '#E53935', fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

function FieldC({ label, value, onChangeText, keyboardType, t }: {
  label: string; value: string;
  onChangeText: (v: string) => void; keyboardType?: any; t: AppTheme;
}) {
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor={t.textMuted}
      />
    </>
  );
}

const makeStyles = (t: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  content: { padding: 16, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatarWrap: { marginBottom: 12, position: 'relative' },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#1565C0', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: '#1565C0', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: t.bg },
  displayName: { fontSize: 20, fontWeight: '700', color: t.text },
  displayEmail: { fontSize: 14, color: t.textSecondary, marginTop: 4 },
  card: {
    backgroundColor: t.surface, borderRadius: 16, padding: 18,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, marginBottom: 16,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: t.text },
  editLink: { fontSize: 14, color: '#1565C0', fontWeight: '600' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: t.divider },
  infoLabel: { fontSize: 13, color: t.textMuted },
  infoValue: { fontSize: 14, color: t.text },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: t.textSecondary, marginTop: 10, marginBottom: 4 },
  input: { borderWidth: 1.5, borderColor: t.border, borderRadius: 8, padding: 10, fontSize: 14, color: t.text, backgroundColor: t.inputBg },
  bloodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  bloodChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: t.primaryLight },
  bloodChipActive: { backgroundColor: '#E53935' },
  bloodChipText: { fontSize: 13, color: '#1565C0', fontWeight: '500' },
  bloodChipTextActive: { color: '#fff', fontWeight: '700' },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: t.border, borderRadius: 8, padding: 12, alignItems: 'center' },
  cancelText: { color: t.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: '#1565C0', borderRadius: 8, padding: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  navRow: {
    backgroundColor: t.surface, borderRadius: 16, padding: 16, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4,
  },
  navRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  navIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: 15, fontWeight: '700', color: t.text },
  navSub: { fontSize: 12, color: t.textMuted, marginTop: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#EF5350', borderRadius: 12, padding: 14, marginBottom: 16 },
  logoutText: { color: '#EF5350', fontWeight: '700', fontSize: 15 },
  version: { textAlign: 'center', color: t.textMuted, fontSize: 12 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.96)', alignItems: 'center', justifyContent: 'center' },
  modalImage: { width: '100%', height: '75%' },
  modalClose: { position: 'absolute', top: 52, right: 20, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  modalActions: { position: 'absolute', bottom: 60, flexDirection: 'row', gap: 12 },
  modalChangeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1565C0', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12, elevation: 4 },
  modalChangeTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  modalRemoveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(239,83,80,0.15)', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#EF5350' },
  modalRemoveTxt: { color: '#EF5350', fontSize: 15, fontWeight: '700' },
  editModalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  editModalCard: { backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  editModalTitle: { fontSize: 17, fontWeight: '700', color: t.text, textAlign: 'center', marginBottom: 16 },
  editModalImg: { width: '100%', height: 240, borderRadius: 16, backgroundColor: t.inputBg, marginBottom: 16 },
  editModalBtns: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 20 },
  editModalBtn: { alignItems: 'center', backgroundColor: t.primaryLight, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, gap: 4, minWidth: 80 },
  editModalBtnTxt: { fontSize: 12, fontWeight: '700', color: '#1565C0' },
  editModalActions: { flexDirection: 'row', gap: 12 },
  editModalCancel: { flex: 1, borderRadius: 14, borderWidth: 1.5, borderColor: t.border, padding: 13, alignItems: 'center' },
  editModalCancelTxt: { fontSize: 15, fontWeight: '600', color: t.textSecondary },
  editModalConfirm: { flex: 2, flexDirection: 'row', backgroundColor: '#1565C0', borderRadius: 14, padding: 13, alignItems: 'center', justifyContent: 'center', gap: 6 },
  editModalConfirmTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
