import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform, Keyboard,
  Animated,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, usePreventRemove } from '@react-navigation/native';
import { MainStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { useTheme, AppTheme } from '../context/ThemeContext';
import { saveReport, copyFileToStorage, generateId, buildReportTitle, getReports, fileIdFromUri } from '../services/storageService';
import { scheduleVisitNotifications } from '../services/notificationService';
import { MedFile, MedReport, ReportType, REPORT_TYPE_LABELS, REPORT_TYPE_COLORS } from '../types';
import { hapticSuccess } from '../utils/haptics';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'Upload'>;
  route: RouteProp<MainStackParamList, 'Upload'>;
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

export default function UploadScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { theme: t } = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  const [reportType, setReportType] = useState<ReportType | null>(null);
  const [otherTypeName, setOtherTypeName] = useState('');
  const [typePickerOpen, setTypePickerOpen] = useState(false);
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
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pincodeInput, setPincodeInput] = useState('');
  const [pincodeHint, setPincodeHint] = useState('');
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [nextVisitDate, setNextVisitDate] = useState<Date | null>(null);
  const [pickerPhase, setPickerPhase] = useState<'none' | 'date' | 'time'>('none');
  const [pickerTemp, setPickerTemp] = useState(new Date());

  const dateRef = useRef<TextInput>(null);
  const otherTypeRef = useRef<TextInput>(null);
  const hospitalRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const doctorRef = useRef<TextInput>(null);
  const patientRef = useRef<TextInput>(null);
  const notesRef = useRef<TextInput>(null);

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
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: true, quality: 0.85 });
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
      multiple: Platform.OS !== 'web', // web only supports single file pick
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
      setFiles(prev => [...prev, { id: serverId, name, uri: serverUri, type, mimeType, size, createdAt: new Date().toISOString() }]);
      const label = type === 'image' ? 'Image uploaded successfully' : type === 'video' ? 'Video uploaded successfully' : 'Document uploaded successfully';
      showUploadToast(label);
    } catch (e: any) {
      console.error('Upload error:', e);
      Alert.alert('Upload failed', e?.message || 'Could not upload file. Please try again.');
    }
  }

  function removeFile(id: string) {
    const f = files.find(x => x.id === id);
    Alert.alert(
      'Remove file?',
      `Remove "${f?.name ?? 'this file'}" from this report?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => setFiles(prev => prev.filter(x => x.id !== id)) },
      ]
    );
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
      const reportId = generateId();
      let visitNotificationIds: string[] | undefined;
      if (nextVisitDate) {
        const ids = await scheduleVisitNotifications({
          reportId,
          reportTitle: title,
          doctorName: doctorName.trim(),
          hospitalName: hospitalName.trim(),
          visitDate: nextVisitDate,
        });
        if (ids.length > 0) visitNotificationIds = ids;
      }
      const report: MedReport = {
        id: reportId, title, date,
        hospitalName: hospitalName.trim(),
        hospitalAddress: hospitalAddress.trim(),
        doctorName: doctorName.trim(),
        patientId: patientId.trim(),
        reportType, otherTypeName: reportType === 'other' ? otherTypeName.trim() : undefined,
        notes: notes.trim(), files,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nextVisitDate: nextVisitDate?.toISOString(),
        visitNotificationIds,
      };
      await saveReport(user!.id, report);
      setSaving(false);
      setAllowLeave(true);
      hapticSuccess();
      setSaveSuccess(true);
      checkmarkScale.setValue(0);
      Animated.spring(checkmarkScale, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }).start();
      setTimeout(() => navigation.goBack(), 1400);
    } catch {
      setSaving(false);
      Alert.alert('Error', 'Could not save report. Please try again.');
    }
  }

  const styles = makeStyles(t);
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
          {/* Tap to toggle inline grid — matches the Next Visit calendar pattern */}
          <TouchableOpacity
            style={[styles.ddTrigger, (reportType || typePickerOpen) && styles.ddTriggerSelected]}
            onPress={() => { Keyboard.dismiss(); setTypePickerOpen(p => !p); }}
            activeOpacity={0.75}
          >
            {reportType ? (
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
            ) : (
              <View style={styles.ddTriggerRow}>
                <Ionicons name="list-outline" size={20} color={t.textMuted} style={{ marginRight: 10 }} />
                <Text style={[styles.ddTriggerLabel, { color: t.textMuted, fontWeight: '400' }]}>
                  Tap to select report type…
                </Text>
                <Ionicons name={typePickerOpen ? 'chevron-up' : 'chevron-down'} size={18} color={t.textMuted} />
              </View>
            )}
          </TouchableOpacity>

          {/* Inline type grid — expands in place, no modal */}
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
                      setReportType(isSelected ? null : rtype);
                      setTypePickerOpen(false);
                      if (rtype === 'other' && !isSelected) setTimeout(() => otherTypeRef.current?.focus(), 100);
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
              style={[styles.input, { marginTop: 10 }]}
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

        <Section title="Next Visit / Follow-up (Optional)">
          {nextVisitDate ? (
            <View style={styles.visitSelectedRow}>
              <Ionicons name="calendar" size={18} color="#1565C0" style={{ marginRight: 8 }} />
              <Text style={styles.visitSelectedText}>{formatVisitDate(nextVisitDate)}</Text>
              <TouchableOpacity onPress={() => { Keyboard.dismiss(); setPickerTemp(nextVisitDate); setPickerPhase('date'); }} style={{ marginLeft: 8 }}>
                <Ionicons name="pencil" size={16} color="#9E9E9E" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setNextVisitDate(null)} style={{ marginLeft: 8 }}>
                <Ionicons name="close-circle" size={20} color="#EF5350" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.visitBtn} onPress={() => { Keyboard.dismiss(); setPickerTemp(new Date()); setPickerPhase('date'); }}>
              <Ionicons name="calendar-outline" size={20} color="#1565C0" />
              <Text style={styles.visitBtnText}>Set Next Visit Date & Reminder</Text>
            </TouchableOpacity>
          )}

          {pickerPhase !== 'none' && (
            <View style={styles.pickerWrap}>
              <Text style={styles.pickerStep}>
                {pickerPhase === 'date' ? 'Step 1 of 2 — Pick date' : 'Step 2 of 2 — Pick time'}
              </Text>
              <DateTimePicker
                value={pickerTemp}
                mode={pickerPhase === 'date' ? 'date' : 'time'}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={pickerPhase === 'date' ? new Date() : undefined}
                onChange={(event, selectedDate) => {
                  if (Platform.OS === 'android') {
                    if (event.type === 'dismissed') { setPickerPhase('none'); return; }
                    const d = selectedDate ?? pickerTemp;
                    if (pickerPhase === 'date') { setPickerTemp(d); setPickerPhase('time'); }
                    else { setNextVisitDate(d); setPickerPhase('none'); }
                    return;
                  }
                  if (selectedDate) setPickerTemp(selectedDate);
                }}
              />
              {Platform.OS === 'ios' && (
                <View style={styles.pickerActions}>
                  <TouchableOpacity onPress={() => setPickerPhase('none')}>
                    <Text style={styles.pickerCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    if (pickerPhase === 'date') setPickerPhase('time');
                    else { setNextVisitDate(pickerTemp); setPickerPhase('none'); }
                  }}>
                    <Text style={styles.pickerConfirm}>{pickerPhase === 'date' ? 'Next →' : 'Set Reminder'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {nextVisitDate && !pickerPhase && (
            <View style={styles.reminderInfo}>
              <Ionicons name="notifications-outline" size={14} color="#1565C0" style={{ marginRight: 6 }} />
              <Text style={styles.reminderText}>
                Reminder notifications every 4 hrs, starting 24 hrs before your visit
              </Text>
            </View>
          )}
        </Section>

        <Section title="Files & Photos *">
          <View style={styles.fileActions}>
            <FileBtn icon="camera" label="Camera" onPress={pickFromCamera} />
            <FileBtn icon="images" label="Gallery" onPress={pickFromGallery} />
            <FileBtn icon="document" label="Document" onPress={pickDocument} />
          </View>

          {/* Images — horizontal scroll */}
          {files.filter(f => f.type === 'image').length > 0 && (
            <View style={{ marginBottom: 10 }}>
              <Text style={styles.fileGroupLabel}>
                Images ({files.filter(f => f.type === 'image').length})
              </Text>
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

          {/* Documents — vertical list */}
          {files.filter(f => f.type !== 'image').length > 0 && (
            <View style={styles.docList}>
              <Text style={styles.fileGroupLabel}>
                Documents ({files.filter(f => f.type !== 'image').length})
              </Text>
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
        </Section>
      </ScrollView>

      {/* Sticky save button — always visible outside scroll */}
      <View style={styles.stickyFooter}>
        <TouchableOpacity style={[styles.saveBtn, (saving || saveSuccess) && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving || saveSuccess}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Report</Text>}
        </TouchableOpacity>
      </View>

      {/* Upload success toast */}
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
  const { theme: t } = useTheme();
  const styles = makeStyles(t);
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function FileBtn({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  const { theme: t } = useTheme();
  const styles = makeStyles(t);
  return (
    <TouchableOpacity style={styles.fileBtn} onPress={onPress}>
      <Ionicons name={icon} size={26} color="#1565C0" />
      <Text style={styles.fileBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function formatVisitDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    + '  '
    + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
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

const makeStyles = (t: AppTheme) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: t.bg },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  section: { marginBottom: 4 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: t.textSecondary, marginTop: 16, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 },
  // Type selector trigger
  ddTrigger: {
    backgroundColor: t.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: t.border,
    paddingVertical: 13,
    paddingHorizontal: 14,
    minHeight: 56,
    justifyContent: 'center',
  },
  ddTriggerSelected: { borderColor: '#1565C0' },
  ddTriggerRow: { flexDirection: 'row', alignItems: 'center' },
  ddTriggerIconBox: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  ddTriggerLabel: { fontSize: 15, fontWeight: '700', color: t.text },
  ddTriggerSub: { fontSize: 12, color: t.textMuted, marginTop: 1 },
  // Inline type grid (like the Next Visit date picker — expands in place)
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    padding: 10,
    backgroundColor: t.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1565C0',
  },
  typeGridItem: {
    width: '22%',
    flexGrow: 1,
    backgroundColor: t.inputBg,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 7,
    borderWidth: 1.5,
    borderColor: 'transparent',
    position: 'relative' as const,
  },
  typeGridItemSelected: {
    backgroundColor: t.primaryLight,
    borderColor: '#1565C0',
  },
  typeGridIcon: {
    width: 42, height: 42, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  typeGridLabel: {
    fontSize: 10, fontWeight: '600', color: t.text,
    textAlign: 'center' as const, lineHeight: 13,
    letterSpacing: -0.1,
  },
  typeGridCheck: {
    position: 'absolute' as const, top: 5, right: 5,
  },
  input: { backgroundColor: t.surface, borderRadius: 10, borderWidth: 1.5, borderColor: t.border, padding: 12, fontSize: 14, color: t.text },
  multiline: { minHeight: 70, paddingTop: 12 },
  notesInput: { minHeight: 100, paddingTop: 12 },
  suggestionBox: {
    backgroundColor: t.surface, borderRadius: 10, borderWidth: 1.5, borderColor: t.primaryLight,
    marginTop: 4, overflow: 'hidden', elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: t.divider },
  suggestionText: { fontSize: 14, color: t.text },
  pincodeRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: t.inputBg, borderRadius: 10,
    borderWidth: 1.5, borderColor: t.border, marginTop: 8, paddingRight: 8,
  },
  pincodeIcon: { marginLeft: 10, marginRight: 4 },
  pincodeInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 6, fontSize: 13, color: t.text },
  pincodeHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#E8F5E9', borderRadius: 8, padding: 10, marginTop: 6,
  },
  pincodeHintText: { flex: 1, fontSize: 13, color: '#2E7D32' },
  visitBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.primaryLight, borderRadius: 10, padding: 12 },
  visitBtnText: { fontSize: 14, color: '#1565C0', fontWeight: '600' },
  visitSelectedRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.primaryLight, borderRadius: 10, padding: 12 },
  visitSelectedText: { flex: 1, fontSize: 14, color: '#1565C0', fontWeight: '600' },
  pickerWrap: { backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border, marginTop: 8, overflow: 'hidden' },
  pickerStep: { fontSize: 12, fontWeight: '700', color: t.textMuted, textAlign: 'center', paddingTop: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  pickerActions: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: t.divider },
  pickerCancel: { fontSize: 15, color: t.textMuted, fontWeight: '600' },
  pickerConfirm: { fontSize: 15, color: '#1565C0', fontWeight: '700' },
  reminderInfo: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#E3F2FD', borderRadius: 8, padding: 10, marginTop: 8 },
  reminderText: { flex: 1, fontSize: 12, color: '#1565C0', lineHeight: 17 },
  fileActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  fileBtn: { flex: 1, backgroundColor: t.surface, borderRadius: 12, borderWidth: 1.5, borderColor: t.border, borderStyle: 'dashed', alignItems: 'center', paddingVertical: 14, gap: 4 },
  fileBtnText: { fontSize: 12, color: '#1565C0', fontWeight: '600' },
  fileGroupLabel: { fontSize: 11, fontWeight: '700', color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  // Image horizontal scroll
  imageScroll: { marginHorizontal: -4 },
  imageCard: { width: 100, marginHorizontal: 4, marginBottom: 4, position: 'relative' as const },
  imageCardThumb: { width: 100, height: 100, borderRadius: 10, backgroundColor: t.inputBg },
  imageCardCheckBadge: { position: 'absolute' as const, top: 5, left: 5, backgroundColor: '#fff', borderRadius: 10 },
  imageCardDelete: { position: 'absolute' as const, top: 5, right: 5, backgroundColor: 'rgba(239,83,80,0.85)', borderRadius: 8, padding: 4 },
  imageCardName: { fontSize: 10, color: t.textMuted, marginTop: 4, textAlign: 'center' as const },
  // Document list
  docList: { gap: 8 },
  docItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.surface, borderRadius: 12, padding: 10, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  docIconBox: { width: 44, height: 44, borderRadius: 8, backgroundColor: t.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 10, position: 'relative' as const },
  docIconEmoji: { fontSize: 22 },
  docCheckBadge: { position: 'absolute' as const, bottom: -2, right: -2, backgroundColor: '#fff', borderRadius: 8 },
  docInfo: { flex: 1 },
  docName: { fontSize: 13, fontWeight: '600', color: t.text },
  docMeta: { fontSize: 11, color: t.textMuted, marginTop: 2 },
  docDeleteBtn: { padding: 6 },
  // Upload toast
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
  stickyFooter: {
    backgroundColor: t.surface, paddingHorizontal: 16, paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopWidth: 1, borderTopColor: t.border,
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
