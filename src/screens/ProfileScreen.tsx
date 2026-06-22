import React, { useCallback, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { ALL_QUOTES, QUOTE_FAV_KEY } from '../constants/quotes';
import { STARRED_KEY } from './StarredReportsScreen';
import { getReports } from '../services/storageService';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function ProfileScreen({ navigation }: { navigation: any }) {
  const { user, logout, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [dob, setDob] = useState(user?.dateOfBirth || '');
  const [blood, setBlood] = useState(user?.bloodGroup || '');
  const [saving, setSaving] = useState(false);
  const [favIds, setFavIds] = useState<string[]>([]);
  const [starredCount, setStarredCount] = useState(0);

  const loadFavs = useCallback(async () => {
    const [quotesJson, starredJson] = await Promise.all([
      AsyncStorage.getItem(QUOTE_FAV_KEY),
      user ? AsyncStorage.getItem(STARRED_KEY(user.id)) : Promise.resolve(null),
    ]);
    setFavIds(quotesJson ? JSON.parse(quotesJson) : []);
    setStarredCount(starredJson ? JSON.parse(starredJson).length : 0);
  }, [user]);

  useFocusEffect(useCallback(() => { loadFavs(); }, [loadFavs]));

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
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.displayName}>{user?.name}</Text>
        <Text style={styles.displayEmail}>{user?.email}</Text>
      </View>

      {/* Personal info card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Personal Info</Text>
          {!editing && (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={styles.editLink}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {editing ? (
          <>
            <Field label="Full Name" value={name} onChangeText={setName} />
            <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Field label="Date of Birth (YYYY-MM-DD)" value={dob} onChangeText={setDob} />
            <Text style={styles.fieldLabel}>Blood Group</Text>
            <View style={styles.bloodRow}>
              {BLOOD_GROUPS.map(bg => (
                <TouchableOpacity
                  key={bg}
                  style={[styles.bloodChip, blood === bg && styles.bloodChipActive]}
                  onPress={() => setBlood(bg)}
                >
                  <Text style={[styles.bloodChipText, blood === bg && styles.bloodChipTextActive]}>{bg}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => {
                setEditing(false);
                setName(user?.name || '');
                setPhone(user?.phone || '');
                setDob(user?.dateOfBirth || '');
                setBlood(user?.bloodGroup || '');
              }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <InfoRow label="Phone" value={user?.phone || '—'} />
            <InfoRow label="Date of Birth" value={user?.dateOfBirth || '—'} />
            <InfoRow label="Blood Group" value={user?.bloodGroup || '—'} highlight />
          </>
        )}
      </View>

      {/* Starred Reports */}
      <TouchableOpacity
        style={styles.navRow}
        onPress={() => navigation.navigate('StarredReports')}
        activeOpacity={0.85}
      >
        <View style={styles.navRowLeft}>
          <View style={[styles.navIcon, { backgroundColor: '#FFF8E1' }]}>
            <Ionicons name="star" size={20} color="#FB8C00" />
          </View>
          <View>
            <Text style={styles.navTitle}>Starred Reports</Text>
            <Text style={styles.navSub}>
              {starredCount === 0 ? 'No starred reports yet' : `${starredCount} report${starredCount !== 1 ? 's' : ''} starred`}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9E9E9E" />
      </TouchableOpacity>

      {/* Saved Quotes — tap to open full screen */}
      <TouchableOpacity
        style={styles.navRow}
        onPress={() => navigation.navigate('SavedQuotes')}
        activeOpacity={0.85}
      >
        <View style={styles.navRowLeft}>
          <View style={[styles.navIcon, { backgroundColor: '#FFEBEE' }]}>
            <Ionicons name="heart" size={20} color="#E53935" />
          </View>
          <View>
            <Text style={styles.navTitle}>Saved Quotes</Text>
            <Text style={styles.navSub}>
              {savedQuotes.length === 0
                ? 'No saved quotes yet'
                : `${savedQuotes.length} quote${savedQuotes.length !== 1 ? 's' : ''} saved`}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9E9E9E" />
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color="#EF5350" style={{ marginRight: 6 }} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.version}>MedVault v1.0.0</Text>
    </ScrollView>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, highlight && { color: '#E53935', fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

function Field({ label, value, onChangeText, keyboardType }: {
  label: string; value: string;
  onChangeText: (t: string) => void; keyboardType?: any;
}) {
  return (
    <>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor="#9E9E9E"
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 16, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1565C0', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  displayName: { fontSize: 20, fontWeight: '700', color: '#212121' },
  displayEmail: { fontSize: 14, color: '#757575', marginTop: 4 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, marginBottom: 16,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#212121' },
  editLink: { fontSize: 14, color: '#1565C0', fontWeight: '600' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  infoLabel: { fontSize: 13, color: '#9E9E9E' },
  infoValue: { fontSize: 14, color: '#212121' },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#424242', marginTop: 10, marginBottom: 4 },
  input: { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 8, padding: 10, fontSize: 14, color: '#212121', backgroundColor: '#FAFAFA' },
  bloodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  bloodChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#E3F2FD' },
  bloodChipActive: { backgroundColor: '#E53935' },
  bloodChipText: { fontSize: 13, color: '#1565C0', fontWeight: '500' },
  bloodChipTextActive: { color: '#fff', fontWeight: '700' },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, alignItems: 'center' },
  cancelText: { color: '#757575', fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: '#1565C0', borderRadius: 8, padding: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  navRow: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4,
  },
  navRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  navIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: 15, fontWeight: '700', color: '#212121' },
  navSub: { fontSize: 12, color: '#9E9E9E', marginTop: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#EF5350', borderRadius: 12, padding: 14, marginBottom: 16 },
  logoutText: { color: '#EF5350', fontWeight: '700', fontSize: 15 },
  version: { textAlign: 'center', color: '#BDBDBD', fontSize: 12 },
});
