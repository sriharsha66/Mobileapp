import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, usePreventRemove } from '@react-navigation/native';
import { MainStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import {
  getReports,
  saveReport,
  copyFileToStorage,
  generateId,
  buildReportTitle,
} from '../services/storageService';
import { MedFile, MedReport, ReportType, REPORT_TYPE_LABELS } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'EditReport'>;
  route: RouteProp<MainStackParamList, 'EditReport'>;
};

const REPORT_TYPES: ReportType[] = [
  'blood_test', 'ecg', 'xray', 'mri', 'ct_scan',
  'ultrasound', 'prescription', 'discharge_summary', 'vaccination', 'other',
];

export default function EditReportScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const { reportId } = route.params;

  const [reportType, setReportType] = useState<ReportType>('blood_test');
  const [date, setDate] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<MedFile[]>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [otherTypeName, setOtherTypeName] = useState('');
  const [pincodeInput, setPincodeInput] = useState('');
  const [pincodeHint, setPincodeHint] = useState('');
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [hospitalHistory, setHospitalHistory] = useState<string[]>([]);
  const [hospitalSuggestions, setHospitalSuggestions] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [allowLeave, setAllowLeave] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const checkmarkScale = useRef(new Animated.Value(0)).current;

  const scrollRef = useRef<ScrollView>(null);
  const hospitalRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const doctorRef = useRef<TextInput>(null);
  const patientRef = useRef<TextInput>(null);
  const notesRef = useRef<TextInput>(null);

  const otherTypeRef = useRef<TextInput>(null);

  useEffect(() => {
    loadReport();
  }, []);

  usePreventRemove(isDirty && !allowLeave, ({ data }) => {
    Alert.alert(
      'Discard changes?',
      'Going back will discard your unsaved changes.',
      [
        { text: 'Stay', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
      ]
    );
  });

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

  async function loadReport() {
    if (!user) return;
    const reports = await getReports(user.id);
    const r = reports.find((x) => x.id === reportId);
    if (r) {
      setReportType(r.reportType);
      setOtherTypeName(r.otherTypeName || '');
      setDate(r.date);
      setHospitalName(r.hospitalName);
      setHospitalAddress(r.hospitalAddress || '');
      setDoctorName(r.doctorName);
      setPatientId(r.patientId || '');
      setNotes(r.notes);
      setFiles(r.files);
    }
    const names = [...new Set(reports.map(rep => rep.hospitalName).filter(Boolean))];
    setHospitalHistory(names);
    setLoaded(true);
  }

  function onHospitalChange(text: string) {
    setHospitalName(text);
    if (text.length >= 2) {
      const q = text.toLowerCase();
      setHospitalSuggestions(hospitalHistory.filter(h => h.toLowerCase().includes(q) && h.toLowerCase() !== text.toLowerCase()));
    } else {
      setHospitalSuggestions([]);
    }
  }

  async function pickFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Camera access is required.'); return; }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const isVideo = asset.type === 'video';
      await addFile(asset.uri, asset.fileName || (isVideo ? 'video.mp4' : 'photo.jpg'), isVideo ? 'video' : 'image', isVideo ? 'video/mp4' : 'image/jpeg', asset.fileSize || 0);
    }
  }

  async function pickFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Gallery access is required.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.85,
    });
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
      setFiles((prev) => [...prev, { id: generateId(), name, uri: destUri, type, mimeType, size, createdAt: new Date().toISOString() }]);
    } catch {
      Alert.alert('Error', 'Could not copy file.');
    }
  }

  function removeFile(id: string) {
    const fileToRemove = files.find((f) => f.id === id);
    if (!fileToRemove) return;

    const mediaFiles = files.filter((f) => f.type === 'image' || f.type === 'video');
    const isMedia = fileToRemove.type === 'image' || fileToRemove.type === 'video';

    if (isMedia && mediaFiles.length <= 1) {
      Alert.alert('Cannot Remove', 'At least one image or video must remain in the report.');
      return;
    }
    if (files.length <= 1) {
      Alert.alert('Cannot Remove', 'At least one file must remain in the report.');
      return;
    }
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  async function handleSave() {
    if (reportType === 'other' && !otherTypeName.trim()) { Alert.alert('Missing Info', 'Please specify the report type name.'); return; }
    if (!hospitalName.trim()) { Alert.alert('Missing Info', 'Hospital / Clinic name is required.'); return; }
    if (!hospitalAddress.trim()) { Alert.alert('Missing Info', 'Hospital address is required.'); return; }
    if (files.length === 0) { Alert.alert('No Files', 'At least one file is required.'); return; }
    const hasMedia = files.some((f) => f.type === 'image' || f.type === 'video');
    if (!hasMedia) { Alert.alert('Media Required', 'At least one image or video must be in the report.'); return; }
    setSaving(true);
    try {
      const reports = await getReports(user!.id);
      const existing = reports.find((r) => r.id === reportId)!;
      const typeLabel = reportType === 'other' ? otherTypeName.trim() : reportType;
      const updated: MedReport = {
        ...existing,
        reportType,
        otherTypeName: reportType === 'other' ? otherTypeName.trim() : undefined,
        date,
        hospitalName: hospitalName.trim(),
        hospitalAddress: hospitalAddress.trim(),
        doctorName: doctorName.trim(),
        patientId: patientId.trim(),
        notes: notes.trim(),
        files,
        title: buildReportTitle(typeLabel, hospitalName.trim(), date),
        updatedAt: new Date().toISOString(),
      };
      await saveReport(user!.id, updated);
      setSaving(false);
      setAllowLeave(true);
      setSaveSuccess(true);
      checkmarkScale.setValue(0);
      Animated.spring(checkmarkScale, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }).start();
      setTimeout(() => navigation.goBack(), 1400);
    } catch {
      setSaving(false);
      Alert.alert('Error', 'Could not save changes.');
    }
  }

  if (!loaded) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#1565C0" /></View>;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F5F7FA' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>

      <SectionLabel title="Report Type" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
        {REPORT_TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.typeChip, reportType === t && styles.typeChipActive]}
            onPress={() => { setReportType(t); setIsDirty(true); if (t === 'other') setTimeout(() => otherTypeRef.current?.focus(), 100); }}
          >
            <Text style={[styles.typeChipText, reportType === t && styles.typeChipTextActive]}>{REPORT_TYPE_LABELS[t]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {reportType === 'other' && (
        <TextInput
          ref={otherTypeRef}
          style={[styles.input, { marginBottom: 4 }]}
          value={otherTypeName}
          onChangeText={v => { setOtherTypeName(v); setIsDirty(true); }}
          placeholder="e.g. Allergy Test, Sleep Study…"
          placeholderTextColor="#9E9E9E"
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={() => hospitalRef.current?.focus()}
        />
      )}

      <SectionLabel title="Visit Date" />
      <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor="#9E9E9E" keyboardType="numeric" returnKeyType="next" onSubmitEditing={() => hospitalRef.current?.focus()} />

      <SectionLabel title="Hospital / Clinic *" />
      <TextInput ref={hospitalRef} style={styles.input} value={hospitalName} onChangeText={v => { onHospitalChange(v); setIsDirty(true); }} placeholder="e.g. Apollo Hospital" placeholderTextColor="#9E9E9E" autoCapitalize="words" returnKeyType="next" onSubmitEditing={() => { setHospitalSuggestions([]); addressRef.current?.focus(); }} />
      {hospitalSuggestions.length > 0 && (
        <View style={styles.suggestionBox}>
          {hospitalSuggestions.slice(0, 4).map(h => (
            <TouchableOpacity key={h} style={styles.suggestionItem} onPress={() => { setHospitalName(h); setHospitalSuggestions([]); }}>
              <Ionicons name="business-outline" size={14} color="#757575" />
              <Text style={styles.suggestionText}>{h}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <SectionLabel title="Hospital Address *" />
      <TextInput ref={addressRef} style={[styles.input, styles.multiline]} value={hospitalAddress} onChangeText={setHospitalAddress} placeholder="Street, Area, City, State, PIN" placeholderTextColor="#9E9E9E" autoCapitalize="sentences" multiline numberOfLines={2} textAlignVertical="top" blurOnSubmit={false} returnKeyType="next" onSubmitEditing={() => doctorRef.current?.focus()} />
      <View style={styles.pincodeRow}>
        <Ionicons name="location-outline" size={18} color="#9E9E9E" style={{ marginLeft: 10, marginRight: 4 }} />
        <TextInput
          style={styles.pincodeInput}
          placeholder="Enter PIN code to auto-fill city"
          placeholderTextColor="#BDBDBD"
          keyboardType="numeric"
          maxLength={6}
          value={pincodeInput}
          onChangeText={(text) => {
            const clean = text.replace(/\D/g, '');
            setPincodeInput(clean);
            if (clean.length === 6) lookupPincode(clean);
            else setPincodeHint('');
          }}
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />
        {pincodeLoading && <ActivityIndicator size="small" color="#1565C0" style={{ marginRight: 8 }} />}
      </View>
      {pincodeHint !== '' && (
        <TouchableOpacity
          style={styles.pincodeHint}
          onPress={() => {
            const suffix = `, ${pincodeHint} - ${pincodeInput}`;
            setHospitalAddress(prev => prev.trim() ? `${prev.trim()}${suffix}` : pincodeHint);
            setPincodeHint('');
            setPincodeInput('');
          }}
        >
          <Ionicons name="add-circle" size={16} color="#00897B" />
          <Text style={styles.pincodeHintText}>
            <Text style={{ fontWeight: '700' }}>{pincodeHint}</Text> — tap to add to address
          </Text>
        </TouchableOpacity>
      )}

      <SectionLabel title="Doctor's Name" />
      <TextInput ref={doctorRef} style={styles.input} value={doctorName} onChangeText={setDoctorName} placeholder="e.g. Dr. Sharma" placeholderTextColor="#9E9E9E" autoCapitalize="words" returnKeyType="next" onSubmitEditing={() => patientRef.current?.focus()} />

      <SectionLabel title="Patient ID (optional)" />
      <TextInput ref={patientRef} style={styles.input} value={patientId} onChangeText={setPatientId} placeholder="Hospital patient ID / OP number" placeholderTextColor="#9E9E9E" autoCapitalize="none" returnKeyType="next" onSubmitEditing={() => notesRef.current?.focus()} />

      <SectionLabel title="Notes" />
      <TextInput
        ref={notesRef}
        style={[styles.input, styles.notesInput]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Diagnosis, symptoms, follow-up..."
        placeholderTextColor="#9E9E9E"
        autoCapitalize="sentences"
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        blurOnSubmit={false}
        returnKeyType="default"
        onFocus={() => {
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
        }}
      />

      <SectionLabel title={`Files (${files.length}) — hold ✕ to remove`} />
      <View style={styles.fileActions}>
        <TouchableOpacity style={styles.fileBtn} onPress={pickFromCamera}><Ionicons name="camera" size={24} color="#1565C0" /><Text style={styles.fileBtnText}>Camera</Text></TouchableOpacity>
        <TouchableOpacity style={styles.fileBtn} onPress={pickFromGallery}><Ionicons name="images" size={24} color="#1565C0" /><Text style={styles.fileBtnText}>Gallery</Text></TouchableOpacity>
        <TouchableOpacity style={styles.fileBtn} onPress={pickDocument}><Ionicons name="document" size={24} color="#1565C0" /><Text style={styles.fileBtnText}>Document</Text></TouchableOpacity>
      </View>

      <View style={styles.fileList}>
        {files.map((f) => (
          <View key={f.id} style={styles.fileItem}>
            {f.type === 'image'
              ? <Image source={{ uri: f.uri }} style={styles.fileThumb} />
              : <View style={styles.fileIconBox}><Text style={{ fontSize: 22 }}>{fileEmoji(f.type)}</Text></View>
            }
            <Text style={styles.fileName} numberOfLines={2}>{f.name}</Text>
            <TouchableOpacity onPress={() => removeFile(f.id)} style={styles.removeBtn}>
              <Ionicons name="close-circle" size={22} color="#EF5350" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

    </ScrollView>
    <View style={styles.stickyFooter}>
      <TouchableOpacity style={[styles.saveBtn, (saving || saveSuccess) && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving || saveSuccess}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
      </TouchableOpacity>
    </View>

    {(saving || saveSuccess) && (
      <View style={styles.overlay}>
        {saving ? (
          <View style={styles.overlayCard}>
            <ActivityIndicator color="#1565C0" size="large" />
            <Text style={styles.overlayText}>Saving changes…</Text>
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

function SectionLabel({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
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
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 16, paddingBottom: 24 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#616161', marginTop: 16, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#E3F2FD', marginRight: 8 },
  typeChipActive: { backgroundColor: '#1565C0' },
  typeChipText: { fontSize: 13, color: '#1565C0', fontWeight: '600' },
  typeChipTextActive: { color: '#fff' },
  input: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1.5, borderColor: '#E0E0E0', padding: 12, fontSize: 14, color: '#212121' },
  multiline: { minHeight: 70, paddingTop: 12 },
  notesInput: { minHeight: 100, paddingTop: 12 },
  pincodeRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F7FA', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E0E0E0',
    marginTop: 8, paddingRight: 8,
  },
  pincodeInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 6, fontSize: 13, color: '#212121' },
  pincodeHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#E8F5E9', borderRadius: 8, padding: 10, marginTop: 6,
  },
  pincodeHintText: { flex: 1, fontSize: 13, color: '#2E7D32' },
  fileActions: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  fileBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#BBDEFB', borderStyle: 'dashed', alignItems: 'center', paddingVertical: 12, gap: 4 },
  fileBtnText: { fontSize: 12, color: '#1565C0', fontWeight: '600' },
  fileList: { gap: 8 },
  fileItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 10, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  fileThumb: { width: 44, height: 44, borderRadius: 6, marginRight: 10 },
  fileIconBox: { width: 44, height: 44, borderRadius: 6, backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  fileName: { flex: 1, fontSize: 13, color: '#424242' },
  removeBtn: { padding: 4 },
  saveBtn: { backgroundColor: '#1565C0', borderRadius: 12, padding: 15, alignItems: 'center', elevation: 3 },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  stickyFooter: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    padding: 16,
    elevation: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  suggestionBox: {
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1,
    borderColor: '#E0E0E0', marginTop: 4, elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4, zIndex: 10,
  },
  suggestionItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  suggestionText: { fontSize: 14, color: '#212121', flex: 1 },
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
