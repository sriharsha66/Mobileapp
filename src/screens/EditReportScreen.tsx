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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme, AppTheme } from '../context/ThemeContext';
import {
  getReports,
  saveReport,
  copyFileToStorage,
  generateId,
  buildReportTitle,
  fileIdFromUri,
} from '../services/storageService';
import { MedFile, MedReport, ReportType, REPORT_TYPE_LABELS, REPORT_TYPE_COLORS } from '../types';
import { hapticSuccess } from '../utils/haptics';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'EditReport'>;
  route: RouteProp<MainStackParamList, 'EditReport'>;
};

const REPORT_TYPES: ReportType[] = [
  'blood_test', 'ecg', 'xray', 'mri', 'ct_scan',
  'ultrasound', 'prescription', 'discharge_summary', 'vaccination', 'other',
];

const TYPE_ICONS: Record<ReportType, keyof typeof Ionicons.glyphMap> = {
  blood_test: 'water-outline',
  ecg: 'pulse-outline',
  xray: 'scan-outline',
  mri: 'aperture-outline',
  ct_scan: 'radio-outline',
  ultrasound: 'wifi-outline',
  prescription: 'medical-outline',
  discharge_summary: 'document-text-outline',
  vaccination: 'shield-checkmark-outline',
  other: 'ellipsis-horizontal-circle-outline',
};

const TYPE_DETAILS: Record<ReportType, string> = {
  blood_test: 'CBC, lipid panel, glucose, thyroid, HbA1c',
  ecg: 'Electrocardiogram, cardiac stress test, Holter',
  xray: 'Chest, bone, dental, spine X-rays',
  mri: 'Brain, spine, joint, abdominal MRI scans',
  ct_scan: 'Chest, abdomen, head, cardiac CT',
  ultrasound: 'Abdominal, cardiac, obstetric, renal',
  prescription: 'Medicine prescriptions, dosage & duration',
  discharge_summary: 'Hospital discharge notes, surgery records',
  vaccination: 'Immunization records, boosters, travel vaccines',
  other: 'Any other medical document or report',
};

export default function EditReportScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const { theme: t } = useTheme();
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
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  function showUploadToast(msg: string) {
    hapticSuccess();
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    setToastVisible(true);
    toastAnim.setValue(0);
    Animated.spring(toastAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setToastVisible(false));
    }, 2200);
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
    if (Platform.OS === 'web') {
      return pickFromGallery();
    }
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Camera access is required. Go to Settings → Privacy → Camera to enable it.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images' as any, quality: 0.85 });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        await addFile(asset.uri, asset.fileName || 'photo.jpg', 'image', asset.mimeType || 'image/jpeg', asset.fileSize || 0);
      }
    } catch (e: any) {
      Alert.alert('Camera Error', e?.message || 'Could not open camera. Please try again.');
    }
  }

  async function pickFromGallery() {
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permission needed', 'Gallery access is required.'); return; }
    }
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
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', '*/*'],
      multiple: Platform.OS !== 'web',
      copyToCacheDirectory: true,
    });
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
      const serverUri = await copyFileToStorage(user!.id, uri, name, mimeType);
      const serverId  = fileIdFromUri(serverUri);
      setFiles((prev) => [...prev, { id: serverId, name, uri: serverUri, type, mimeType, size, createdAt: new Date().toISOString() }]);
      const label = type === 'image' ? 'Image uploaded successfully' : type === 'video' ? 'Video uploaded successfully' : 'Document uploaded successfully';
      showUploadToast(label);
    } catch (e: any) {
      console.error('Upload error:', e);
      Alert.alert('Upload failed', e?.message || 'Could not upload file. Please try again.');
    }
  }

  function removeFile(id: string) {
    const fileToRemove = files.find((f) => f.id === id);
    if (!fileToRemove) return;
    Alert.alert(
      'Remove file?',
      `Remove "${fileToRemove.name}" from this report?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
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
          },
        },
      ]
    );
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
      hapticSuccess();
      setSaveSuccess(true);
      checkmarkScale.setValue(0);
      Animated.spring(checkmarkScale, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }).start();
      setTimeout(() => navigation.goBack(), 1400);
    } catch {
      setSaving(false);
      Alert.alert('Error', 'Could not save changes.');
    }
  }

  const { bottom: bottomInset } = useSafeAreaInsets();
  const styles = makeStyles(t, bottomInset);
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
      <TouchableOpacity
        style={[styles.ddTrigger, styles.ddTriggerSelected]}
        onPress={() => { Keyboard.dismiss(); setTypePickerOpen(p => !p); }}
        activeOpacity={0.75}
      >
        <View style={styles.ddTriggerRow}>
          <View style={[styles.ddTriggerIconBox, { backgroundColor: REPORT_TYPE_COLORS[reportType] + '22' }]}>
            <Ionicons name={TYPE_ICONS[reportType]} size={20} color={REPORT_TYPE_COLORS[reportType]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ddTriggerLabel}>{REPORT_TYPE_LABELS[reportType]}</Text>
            <Text style={styles.ddTriggerSub} numberOfLines={1}>{TYPE_DETAILS[reportType]}</Text>
          </View>
          <Ionicons name={typePickerOpen ? 'chevron-up' : 'chevron-down'} size={18} color={t.textMuted} />
        </View>
      </TouchableOpacity>

      {typePickerOpen && (
        <View style={styles.typeGrid}>
          {REPORT_TYPES.map(rtype => {
            const isSelected = reportType === rtype;
            const color = REPORT_TYPE_COLORS[rtype];
            return (
              <TouchableOpacity
                key={rtype}
                style={[styles.typeGridItem, isSelected && styles.typeGridItemSelected]}
                onPress={() => {
                  setReportType(rtype);
                  setIsDirty(true);
                  setTypePickerOpen(false);
                  if (rtype === 'other') setTimeout(() => otherTypeRef.current?.focus(), 100);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.typeGridIcon, { backgroundColor: isSelected ? color + '33' : color + '18' }]}>
                  <Ionicons name={TYPE_ICONS[rtype]} size={22} color={color} />
                </View>
                <Text style={[styles.typeGridLabel, isSelected && { color: '#1565C0' }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}>
                  {REPORT_TYPE_LABELS[rtype]}
                </Text>
                {isSelected && (
                  <View style={styles.typeGridCheck}>
                    <Ionicons name="checkmark-circle" size={16} color="#1565C0" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {reportType === 'other' && (
        <TextInput
          ref={otherTypeRef}
          style={[styles.input, { marginTop: 10, marginBottom: 4 }]}
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

      <SectionLabel title={`Files & Photos (${files.length})`} />
      <View style={styles.fileActions}>
        <TouchableOpacity style={styles.fileBtn} onPress={pickFromCamera}><Ionicons name="camera" size={24} color="#1565C0" /><Text style={styles.fileBtnText}>Camera</Text></TouchableOpacity>
        <TouchableOpacity style={styles.fileBtn} onPress={pickFromGallery}><Ionicons name="images" size={24} color="#1565C0" /><Text style={styles.fileBtnText}>Gallery</Text></TouchableOpacity>
        <TouchableOpacity style={styles.fileBtn} onPress={pickDocument}><Ionicons name="document" size={24} color="#1565C0" /><Text style={styles.fileBtnText}>Document</Text></TouchableOpacity>
      </View>

      {files.filter(f => f.type === 'image').length > 0 && (
        <View style={{ marginBottom: 10 }}>
          <Text style={styles.fileGroupLabel}>Images ({files.filter(f => f.type === 'image').length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
            {files.filter(f => f.type === 'image').map(f => (
              <View key={f.id} style={styles.imageCard}>
                <Image source={{ uri: f.uri }} style={styles.imageCardThumb} />
                <View style={styles.imageCardCheckBadge}>
                  <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                </View>
                <TouchableOpacity onPress={() => removeFile(f.id)} style={styles.imageCardDelete}>
                  <Ionicons name="trash-outline" size={16} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.imageCardName} numberOfLines={1}>{f.name}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {files.filter(f => f.type !== 'image').length > 0 && (
        <View style={styles.docList}>
          <Text style={styles.fileGroupLabel}>Documents ({files.filter(f => f.type !== 'image').length})</Text>
          {files.filter(f => f.type !== 'image').map(f => (
            <View key={f.id} style={styles.docItem}>
              <View style={styles.docIconBox}>
                <Text style={styles.docIconEmoji}>{fileEmoji(f.type)}</Text>
                <View style={styles.docCheckBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                </View>
              </View>
              <View style={styles.docInfo}>
                <Text style={styles.docName} numberOfLines={2}>{f.name}</Text>
                <Text style={styles.docMeta}>{f.type.toUpperCase()} · {formatSize(f.size)}</Text>
              </View>
              <TouchableOpacity onPress={() => removeFile(f.id)} style={styles.docDeleteBtn}>
                <Ionicons name="trash-outline" size={20} color="#EF5350" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

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

    {toastVisible && (
      <Animated.View
        pointerEvents="none"
        style={[styles.uploadToast, {
          opacity: toastAnim,
          transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        }]}
      >
        <Ionicons name="checkmark-circle" size={20} color="#fff" />
        <Text style={styles.uploadToastText}>{toastMsg}</Text>
      </Animated.View>
    )}
    </KeyboardAvoidingView>
  );
}

function SectionLabel({ title }: { title: string }) {
  const { theme: t } = useTheme();
  const styles = makeStyles(t);
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

function formatSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

const makeStyles = (t: AppTheme, bottomInset: number = 0) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  content: { padding: 16, paddingBottom: 24 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: t.textSecondary, marginTop: 16, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 },
  ddTrigger: {
    backgroundColor: t.surface, borderRadius: 12, borderWidth: 1.5,
    borderColor: t.border, paddingVertical: 13, paddingHorizontal: 14,
    minHeight: 56, justifyContent: 'center',
  },
  ddTriggerSelected: { borderColor: '#1565C0' },
  ddTriggerRow: { flexDirection: 'row', alignItems: 'center' },
  ddTriggerIconBox: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  ddTriggerLabel: { fontSize: 15, fontWeight: '700', color: t.text },
  ddTriggerSub: { fontSize: 12, color: t.textMuted, marginTop: 1 },
  typeGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8,
    padding: 10, backgroundColor: t.surface,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#1565C0',
  },
  typeGridItem: {
    width: '22%', flexGrow: 1, backgroundColor: t.inputBg,
    borderRadius: 10, paddingVertical: 12, paddingHorizontal: 6,
    alignItems: 'center', gap: 7, borderWidth: 1.5,
    borderColor: 'transparent', position: 'relative' as const,
  },
  typeGridItemSelected: { backgroundColor: t.primaryLight, borderColor: '#1565C0' },
  typeGridIcon: {
    width: 42, height: 42, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  typeGridLabel: {
    fontSize: 10, fontWeight: '600', color: t.text,
    textAlign: 'center' as const, lineHeight: 13,
    letterSpacing: -0.1,
  },
  typeGridCheck: { position: 'absolute' as const, top: 5, right: 5 },
  input: { backgroundColor: t.surface, borderRadius: 10, borderWidth: 1.5, borderColor: t.border, padding: 12, fontSize: 14, color: t.text },
  multiline: { minHeight: 70, paddingTop: 12 },
  notesInput: { minHeight: 100, paddingTop: 12 },
  pincodeRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: t.inputBg, borderRadius: 10,
    borderWidth: 1.5, borderColor: t.border,
    marginTop: 8, paddingRight: 8,
  },
  pincodeInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 6, fontSize: 13, color: t.text },
  pincodeHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#E8F5E9', borderRadius: 8, padding: 10, marginTop: 6,
  },
  pincodeHintText: { flex: 1, fontSize: 13, color: '#2E7D32' },
  fileActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  fileBtn: { flex: 1, backgroundColor: t.surface, borderRadius: 12, borderWidth: 1.5, borderColor: t.border, borderStyle: 'dashed', alignItems: 'center', paddingVertical: 12, gap: 4 },
  fileBtnText: { fontSize: 12, color: '#1565C0', fontWeight: '600' },
  fileGroupLabel: { fontSize: 11, fontWeight: '700', color: t.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 8 },
  imageScroll: { marginHorizontal: -4 },
  imageCard: { width: 100, marginHorizontal: 4, marginBottom: 4, position: 'relative' as const },
  imageCardThumb: { width: 100, height: 100, borderRadius: 10, backgroundColor: t.inputBg },
  imageCardCheckBadge: { position: 'absolute' as const, top: 5, left: 5, backgroundColor: '#fff', borderRadius: 10 },
  imageCardDelete: { position: 'absolute' as const, top: 5, right: 5, backgroundColor: 'rgba(239,83,80,0.85)', borderRadius: 8, padding: 4 },
  imageCardName: { fontSize: 10, color: t.textMuted, marginTop: 4, textAlign: 'center' as const },
  docList: { gap: 8 },
  docItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.surface, borderRadius: 12, padding: 10, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  docIconBox: { width: 44, height: 44, borderRadius: 8, backgroundColor: t.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 10, position: 'relative' as const },
  docIconEmoji: { fontSize: 22 },
  docCheckBadge: { position: 'absolute' as const, bottom: -2, right: -2, backgroundColor: '#fff', borderRadius: 8 },
  docInfo: { flex: 1 },
  docName: { fontSize: 13, fontWeight: '600', color: t.text },
  docMeta: { fontSize: 11, color: t.textMuted, marginTop: 2 },
  docDeleteBtn: { padding: 6 },
  uploadToast: {
    position: 'absolute' as const,
    bottom: 88,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2E7D32',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    zIndex: 100,
  },
  uploadToastText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  saveBtn: { backgroundColor: '#1565C0', borderRadius: 12, padding: 15, alignItems: 'center', elevation: 3 },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  stickyFooter: {
    backgroundColor: t.surface,
    borderTopWidth: 1,
    borderTopColor: t.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Math.max(bottomInset, Platform.OS === 'ios' ? 28 : 0) + 12,
    elevation: 8,
  },
  suggestionBox: {
    backgroundColor: t.surface, borderRadius: 10, borderWidth: 1,
    borderColor: t.border, marginTop: 4, elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4, zIndex: 10,
  },
  suggestionItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderBottomWidth: 1, borderBottomColor: t.divider,
  },
  suggestionText: { fontSize: 14, color: t.text, flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  overlayCard: {
    backgroundColor: t.surface,
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
    color: t.text,
    marginTop: 14,
  },
});
