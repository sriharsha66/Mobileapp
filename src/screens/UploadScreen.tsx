import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform, Keyboard,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, usePreventRemove } from '@react-navigation/native';
import { MainStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { saveReport, copyFileToStorage, generateId, buildReportTitle, getReports } from '../services/storageService';
import { MedFile, MedReport, ReportType, REPORT_TYPE_LABELS } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'Upload'>;
  route: RouteProp<MainStackParamList, 'Upload'>;
};

const REPORT_TYPES: ReportType[] = [
  'blood_test', 'ecg', 'xray', 'mri', 'ct_scan',
  'ultrasound', 'prescription', 'discharge_summary', 'vaccination', 'other',
];

export default function UploadScreen({ navigation }: Props) {
  const { user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const [reportType, setReportType] = useState<ReportType | null>(null);
  const [otherTypeName, setOtherTypeName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalSuggestions, setHospitalSuggestions] = useState<string[]>([]);
  const [hospitalHistory, setHospitalHistory] = useState<string[]>([]);
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<MedFile[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [allowLeave, setAllowLeave] = useState(false);
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const [pincodeInput, setPincodeInput] = useState('');
  const [pincodeHint, setPincodeHint] = useState('');
  const [pincodeLoading, setPincodeLoading] = useState(false);

  const dateRef = useRef<TextInput>(null);
  const otherTypeRef = useRef<TextInput>(null);
  const hospitalRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const doctorRef = useRef<TextInput>(null);
  const patientRef = useRef<TextInput>(null);
  const notesRef = useRef<TextInput>(null);

  useEffect(() => {
    async function loadHistory() {
      if (!user) return;
      const reports = await getReports(user.id);
      const names = [...new Set(reports.map(r => r.hospitalName).filter(Boolean))];
      setHospitalHistory(names);
    }
    loadHistory();
  }, [user]);

  const isDirty = reportType !== null || hospitalName.trim() !== '' || files.length > 0 || notes.trim() !== '';

  usePreventRemove(isDirty && !allowLeave, ({ data }) => {
    Alert.alert(
      'Discard changes?',
      'Going back will discard your unsaved report.',
      [
        { text: 'Stay', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
      ]
    );
  });

  function onHospitalChange(text: string) {
    setHospitalName(text);
    if (text.length >= 2) {
      setHospitalSuggestions(
        hospitalHistory.filter(h => h.toLowerCase().includes(text.toLowerCase()) && h !== text).slice(0, 4)
      );
    } else {
      setHospitalSuggestions([]);
    }
  }

  async function lookupPincode(pin: string) {
    setPincodeLoading(true);
    try {
      const resp = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await resp.json();
      if (data?.[0]?.Status === 'Success' && data[0].PostOffice?.length > 0) {
        const po = data[0].PostOffice[0];
        setPincodeHint(`${po.District}, ${po.State}`);
      } else {
        setPincodeHint('');
      }
    } catch {
      setPincodeHint('');
    } finally {
      setPincodeLoading(false);
    }
  }

  async function pickFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Camera access is required.'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], quality: 0.85, videoMaxDuration: 120 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const isVideo = asset.type === 'video';
      await addFile(asset.uri, asset.fileName || (isVideo ? 'video.mp4' : 'photo.jpg'), isVideo ? 'video' : 'image', isVideo ? 'video/mp4' : 'image/jpeg', asset.fileSize || 0);
    }
  }

  async function pickFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Gallery access is required.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: true, quality: 0.85 });
    if (!result.canceled) {
      for (const asset of result.assets) {
        const isVideo = asset.type === 'video';
        await addFile(asset.uri, asset.fileName || (isVideo ? 'video.mp4' : 'image.jpg'), isVideo ? 'video' : 'image', asset.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'), asset.fileSize || 0);
      }
    }
  }

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', '*/*'], multiple: true, copyToCacheDirectory: true });
    if (!result.canceled) {
      for (const asset of result.assets) {
        const fileType = getFileType(asset.mimeType || '', asset.name);
        await addFile(asset.uri, asset.name, fileType, asset.mimeType || 'application/octet-stream', asset.size || 0);
      }
    }
  }

  function getFileType(mimeType: string, name: string): MedFile['type'] {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType === 'application/dicom' || name.toLowerCase().endsWith('.dcm')) return 'dicom';
    return 'pdf';
  }

  async function addFile(uri: string, name: string, type: MedFile['type'], mimeType: string, size: number) {
    try {
      const destUri = await copyFileToStorage(user!.id, uri, name);
      setFiles(prev => [...prev, { id: generateId(), name, uri: destUri, type, mimeType, size, createdAt: new Date().toISOString() }]);
    } catch {
      Alert.alert('Error', 'Could not copy file. Please try again.');
    }
  }

  function removeFile(id: string) {
    setFiles(prev => prev.filter(f => f.id !== id));
  }

  async function handleSave() {
    if (!reportType) { Alert.alert('Missing Info', 'Please select a report type.'); return; }
    if (reportType === 'other' && !otherTypeName.trim()) { Alert.alert('Missing Info', 'Please specify the report type name.'); return; }
    if (!hospitalName.trim()) { Alert.alert('Missing Info', 'Hospital / Clinic name is required.'); return; }
    if (!hospitalAddress.trim()) { Alert.alert('Missing Info', 'Hospital address is required.'); return; }
    if (files.length === 0) { Alert.alert('No Files', 'Please add at least one file or photo.'); return; }
    setSaving(true);
    try {
      const typeLabel = reportType === 'other' ? otherTypeName.trim() : reportType;
      const title = buildReportTitle(typeLabel, hospitalName.trim(), date);
      const report: MedReport = {
        id: generateId(), title, date,
        hospitalName: hospitalName.trim(),
        hospitalAddress: hospitalAddress.trim(),
        doctorName: doctorName.trim(),
        patientId: patientId.trim(),
        reportType, otherTypeName: reportType === 'other' ? otherTypeName.trim() : undefined,
        notes: notes.trim(), files,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveReport(user!.id, report);
      setSaving(false);
      setAllowLeave(true);
      setSaveSuccess(true);
      checkmarkScale.setValue(0);
      Animated.spring(checkmarkScale, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }).start();
      setTimeout(() => navigation.goBack(), 1400);
    } catch {
      setSaving(false);
      Alert.alert('Error', 'Could not save report. Please try again.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Section title="Select Report Type *">
          {!reportType && (
            <Text style={styles.typeHint}>Tap a type below to get started</Text>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {REPORT_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.typeChip, reportType === t && styles.typeChipActive]}
                onPress={() => {
                  const next = reportType === t ? null : t;
                  setReportType(next);
                  if (next === 'other') {
                    setTimeout(() => otherTypeRef.current?.focus(), 100);
                  }
                }}
              >
                <View style={styles.chipInner}>
                  <Text style={[styles.typeChipText, reportType === t && styles.typeChipTextActive]}>
                    {REPORT_TYPE_LABELS[t]}
                  </Text>
                  {reportType === t && (
                    <Ionicons name="checkmark" size={12} color="#fff" style={{ marginLeft: 4 }} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {reportType === 'other' && (
            <TextInput
              ref={otherTypeRef}
              style={[styles.input, { marginTop: 8 }]}
              value={otherTypeName}
              onChangeText={setOtherTypeName}
              placeholder="e.g. Allergy Test, Sleep Study…"
              placeholderTextColor="#9E9E9E"
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => dateRef.current?.focus()}
            />
          )}
        </Section>

        <Section title="Visit Date">
          <TextInput
            ref={dateRef}
            style={styles.input} value={date} onChangeText={setDate}
            placeholder="YYYY-MM-DD" placeholderTextColor="#9E9E9E"
            keyboardType="numeric" returnKeyType="next"
            onSubmitEditing={() => hospitalRef.current?.focus()}
          />
        </Section>

        <Section title="Hospital / Clinic *">
          <TextInput
            ref={hospitalRef} style={styles.input} value={hospitalName}
            onChangeText={onHospitalChange}
            placeholder="e.g. Apollo Hospital" placeholderTextColor="#9E9E9E"
            autoCapitalize="words" returnKeyType="next"
            onSubmitEditing={() => { setHospitalSuggestions([]); addressRef.current?.focus(); }}
            onBlur={() => setTimeout(() => setHospitalSuggestions([]), 150)}
          />
          {hospitalSuggestions.length > 0 && (
            <View style={styles.suggestionBox}>
              {hospitalSuggestions.map(s => (
                <TouchableOpacity key={s} style={styles.suggestionItem} onPress={() => { setHospitalName(s); setHospitalSuggestions([]); }}>
                  <Ionicons name="business-outline" size={14} color="#9E9E9E" style={{ marginRight: 6 }} />
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Section>

        <Section title="Hospital Address *">
          <TextInput
            ref={addressRef}
            style={[styles.input, styles.multiline]}
            value={hospitalAddress} onChangeText={setHospitalAddress}
            placeholder="Street, Area, City, State, PIN" placeholderTextColor="#9E9E9E"
            autoCapitalize="sentences" multiline numberOfLines={2}
            textAlignVertical="top" blurOnSubmit={false}
            returnKeyType="next" onSubmitEditing={() => doctorRef.current?.focus()}
          />
          <View style={styles.pincodeRow}>
            <Ionicons name="location-outline" size={18} color="#9E9E9E" style={styles.pincodeIcon} />
            <TextInput
              style={styles.pincodeInput}
              placeholder="Enter PIN code to auto-fill city"
              placeholderTextColor="#BDBDBD" keyboardType="numeric" maxLength={6}
              value={pincodeInput}
              onChangeText={text => {
                const clean = text.replace(/\D/g, '');
                setPincodeInput(clean);
                if (clean.length === 6) lookupPincode(clean);
                else setPincodeHint('');
              }}
              returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()}
            />
            {pincodeLoading && <ActivityIndicator size="small" color="#1565C0" style={{ marginRight: 8 }} />}
          </View>
          {pincodeHint !== '' && (
            <TouchableOpacity
              style={styles.pincodeHint}
              onPress={() => {
                const suffix = `, ${pincodeHint} - ${pincodeInput}`;
                setHospitalAddress(prev => prev.trim() ? `${prev.trim()}${suffix}` : pincodeHint);
                setPincodeHint(''); setPincodeInput('');
              }}
            >
              <Ionicons name="add-circle" size={16} color="#00897B" />
              <Text style={styles.pincodeHintText}><Text style={{ fontWeight: '700' }}>{pincodeHint}</Text> — tap to add to address</Text>
            </TouchableOpacity>
          )}
        </Section>

        <Section title="Doctor's Name">
          <TextInput
            ref={doctorRef} style={styles.input} value={doctorName} onChangeText={setDoctorName}
            placeholder="e.g. Dr. Sharma" placeholderTextColor="#9E9E9E"
            autoCapitalize="words" returnKeyType="next"
            onSubmitEditing={() => patientRef.current?.focus()}
          />
        </Section>

        <Section title="Patient ID (optional)">
          <TextInput
            ref={patientRef} style={styles.input} value={patientId} onChangeText={setPatientId}
            placeholder="Hospital patient ID / OP number" placeholderTextColor="#9E9E9E"
            autoCapitalize="none" returnKeyType="next"
            onSubmitEditing={() => notesRef.current?.focus()}
          />
        </Section>

        <Section title="Notes">
          <TextInput
            ref={notesRef}
            style={[styles.input, styles.notesInput]}
            value={notes} onChangeText={setNotes}
            placeholder="Diagnosis, symptoms, follow-up date..." placeholderTextColor="#9E9E9E"
            autoCapitalize="sentences" multiline numberOfLines={4}
            textAlignVertical="top" blurOnSubmit returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
            onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200)}
          />
        </Section>

        <Section title="Files & Photos *">
          <View style={styles.fileActions}>
            <FileBtn icon="camera" label="Camera" onPress={pickFromCamera} />
            <FileBtn icon="images" label="Gallery" onPress={pickFromGallery} />
            <FileBtn icon="document" label="Document" onPress={pickDocument} />
          </View>
          {files.length > 0 && (
            <View style={styles.fileList}>
              {files.map(f => (
                <View key={f.id} style={styles.fileItem}>
                  {f.type === 'image'
                    ? <Image source={{ uri: f.uri }} style={styles.fileThumb} />
                    : <View style={styles.fileIconBox}><Text style={styles.fileIconEmoji}>{fileEmoji(f.type)}</Text></View>}
                  <Text style={styles.fileName} numberOfLines={2}>{f.name}</Text>
                  <TouchableOpacity onPress={() => removeFile(f.id)} style={styles.removeBtn}>
                    <Ionicons name="close-circle" size={22} color="#EF5350" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </Section>
      </ScrollView>

      {/* Sticky save button — always visible outside scroll */}
      <View style={styles.stickyFooter}>
        <TouchableOpacity style={[styles.saveBtn, (saving || saveSuccess) && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving || saveSuccess}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Report</Text>}
        </TouchableOpacity>
      </View>

      {/* Save progress / success overlay */}
      {(saving || saveSuccess) && (
        <View style={styles.overlay}>
          {saving ? (
            <View style={styles.overlayCard}>
              <ActivityIndicator color="#1565C0" size="large" />
              <Text style={styles.overlayText}>Saving report…</Text>
            </View>
          ) : (
            <Animated.View style={[styles.overlayCard, { transform: [{ scale: checkmarkScale }] }]}>
              <Ionicons name="checkmark-circle" size={72} color="#4CAF50" />
              <Text style={styles.overlayText}>Saved successfully!</Text>
            </Animated.View>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function FileBtn({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.fileBtn} onPress={onPress}>
      <Ionicons name={icon} size={26} color="#1565C0" />
      <Text style={styles.fileBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function fileEmoji(type: MedFile['type']): string {
  switch (type) {
    case 'pdf': return '📄';
    case 'video': return '🎥';
    case 'dicom': return '🩻';
    default: return '📎';
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F7FA' },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  section: { marginBottom: 4 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#616161', marginTop: 16, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 },
  typeHint: { fontSize: 12, color: '#FB8C00', fontWeight: '600', marginBottom: 8 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#E3F2FD', marginRight: 8 },
  typeChipActive: { backgroundColor: '#1565C0' },
  chipInner: { flexDirection: 'row', alignItems: 'center' },
  typeChipText: { fontSize: 13, color: '#1565C0', fontWeight: '600' },
  typeChipTextActive: { color: '#fff' },
  input: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1.5, borderColor: '#E0E0E0', padding: 12, fontSize: 14, color: '#212121' },
  multiline: { minHeight: 70, paddingTop: 12 },
  notesInput: { minHeight: 100, paddingTop: 12 },
  // Hospital suggestions
  suggestionBox: {
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1.5, borderColor: '#E3F2FD',
    marginTop: 4, overflow: 'hidden', elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  suggestionText: { fontSize: 14, color: '#212121' },
  // Pincode
  pincodeRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F7FA', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E0E0E0', marginTop: 8, paddingRight: 8,
  },
  pincodeIcon: { marginLeft: 10, marginRight: 4 },
  pincodeInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 6, fontSize: 13, color: '#212121' },
  pincodeHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#E8F5E9', borderRadius: 8, padding: 10, marginTop: 6,
  },
  pincodeHintText: { flex: 1, fontSize: 13, color: '#2E7D32' },
  // Files
  fileActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  fileBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#BBDEFB', borderStyle: 'dashed', alignItems: 'center', paddingVertical: 14, gap: 4 },
  fileBtnText: { fontSize: 12, color: '#1565C0', fontWeight: '600' },
  fileList: { gap: 8 },
  fileItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 10, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  fileThumb: { width: 44, height: 44, borderRadius: 6, marginRight: 10 },
  fileIconBox: { width: 44, height: 44, borderRadius: 6, backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  fileIconEmoji: { fontSize: 22 },
  fileName: { flex: 1, fontSize: 13, color: '#424242' },
  removeBtn: { padding: 4 },
  // Sticky footer
  stickyFooter: {
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopWidth: 1, borderTopColor: '#E0E0E0',
    elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  saveBtn: { backgroundColor: '#1565C0', borderRadius: 12, padding: 15, alignItems: 'center', elevation: 2 },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  overlayCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 40,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  overlayText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#212121',
    marginTop: 14,
  },
});
