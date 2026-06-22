import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Dimensions,
  Modal,
  StatusBar,
  Share,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { PinchGestureHandler, TapGestureHandler, State } from 'react-native-gesture-handler';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as LegacyFS from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { MainStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { getReports, deleteReport } from '../services/storageService';
import { MedFile, MedReport, REPORT_TYPE_COLORS, REPORT_TYPE_LABELS } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'ReportDetail'>;
  route: RouteProp<MainStackParamList, 'ReportDetail'>;
};

const { width: W, height: H } = Dimensions.get('window');

export default function ReportDetailScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const { reportId } = route.params;
  const [report, setReport] = useState<MedReport | null>(null);
  const [previewFile, setPreviewFile] = useState<MedFile | null>(null);
  const [exporting, setExporting] = useState(false);

  async function loadReport() {
    if (!user) return;
    const reports = await getReports(user.id);
    setReport(reports.find((r) => r.id === reportId) || null);
  }

  useEffect(() => { loadReport(); }, [reportId]);

  // Reload if coming back from EditReport
  useFocusEffect(useCallback(() => { loadReport(); }, [reportId]));

  // Keep header buttons fresh with useCallback
  const handleSharePrompt = useCallback(() => {
    if (!report) return;
    Alert.alert('Share Report', 'Choose a format:', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Share as Text', onPress: () => shareAsText(report) },
      { text: 'Export as PDF', onPress: () => shareAsPDF(report) },
    ]);
  }, [report]);

  useEffect(() => {
    if (!report) return;
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 6, marginRight: 4 }}>
          {exporting ? (
            <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
          ) : (
            <TouchableOpacity onPress={handleSharePrompt} style={styles.headerBtn}>
              <Ionicons name="share-social-outline" size={18} color="#1565C0" />
              <Text style={styles.headerBtnLabel}>Share</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => navigation.navigate('EditReport', { reportId })}
            style={styles.headerBtn}
          >
            <Ionicons name="create-outline" size={18} color="#1565C0" />
            <Text style={styles.headerBtnLabel}>Edit</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [report, exporting, handleSharePrompt]);

  async function shareAsText(r: MedReport) {
    const lines = [
      `📋 MedVault Report`,
      `━━━━━━━━━━━━━━━━━━━`,
      `Title: ${r.title}`,
      `Type: ${REPORT_TYPE_LABELS[r.reportType]}`,
      `Date: ${formatDate(r.date)}`,
      r.hospitalName && `Hospital: ${r.hospitalName}`,
      r.hospitalAddress && `Address: ${r.hospitalAddress}`,
      r.doctorName && `Doctor: Dr. ${r.doctorName.replace(/^Dr\.?\s*/i, '')}`,
      r.patientId && `Patient ID: ${r.patientId}`,
      r.notes && `\nNotes: ${r.notes}`,
      `\nFiles: ${r.files.length} attached`,
      `\nShared via MedVault`,
    ].filter(Boolean).join('\n');
    await Share.share({ message: lines, title: r.title });
  }

  async function shareAsPDF(r: MedReport) {
    setExporting(true);
    try {
      const accent = REPORT_TYPE_COLORS[r.reportType] || '#1565C0';
      const imageFiles = r.files.filter((f) => f.type === 'image');
      let imageHtml = '';
      if (imageFiles.length > 0) {
        imageHtml += `<div class="sec">Attached Images (${imageFiles.length})</div>`;
        for (const f of imageFiles) {
          try {
            const b64 = await LegacyFS.readAsStringAsync(f.uri, { encoding: LegacyFS.EncodingType.Base64 });
            imageHtml += `<div class="img-block"><img src="data:image/jpeg;base64,${b64}" /></div>`;
          } catch {}
        }
      }

      const uploadedOn = new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
      const generatedOn = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

      const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>
  @page { margin: 12mm; size: A4; }
  *{ box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body{ font-family: Helvetica, Arial, sans-serif; color: #222; font-size: 13px; line-height: 1.55; margin: 0; padding: 0; }
  .hdr{ border-bottom: 3px solid ${accent}; padding-bottom: 14px; margin-bottom: 18px; page-break-inside: avoid; }
  .badge{ display: inline-block; padding: 3px 10px; border-radius: 5px; font-size: 11px; font-weight: 700; background: ${accent}22; color: ${accent}; margin-bottom: 8px; }
  h1{ color: ${accent}; font-size: 18px; margin: 0 0 4px; }
  .subtitle{ color: #777; font-size: 12px; margin: 0; }
  table.meta{ width: 100%; border-collapse: collapse; margin: 16px 0; page-break-inside: avoid; }
  table.meta td{ padding: 8px 12px; vertical-align: top; border: 1px solid #E0E0E0; }
  table.meta .k{ background: #F0F4F8; color: #333; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; width: 120px; white-space: nowrap; }
  table.meta .v{ color: #222; font-size: 13px; }
  .notes{ background: #EEF7FF; border-left: 4px solid ${accent}; padding: 10px 14px; margin: 14px 0; page-break-inside: avoid; }
  .notes-lbl{ font-size: 10px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 5px; }
  .notes-txt{ color: #333; font-style: italic; font-size: 13px; }
  .sec{ font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 1px; margin: 20px 0 8px; padding-bottom: 5px; border-bottom: 1px solid #DDD; page-break-after: avoid; }
  .img-block{ page-break-inside: avoid; margin: 10px 0; }
  .img-block img{ max-width: 100%; height: auto; display: block; border-radius: 6px; border: 1px solid #EEE; }
  .footer{ text-align: center; color: #BDBDBD; font-size: 10px; margin-top: 24px; padding-top: 10px; border-top: 1px solid #E0E0E0; page-break-inside: avoid; }
</style>
</head>
<body>
<div class="hdr">
  <span class="badge">${REPORT_TYPE_LABELS[r.reportType]}</span>
  <h1>${r.title}</h1>
  <p class="subtitle">Visit Date: ${formatDate(r.date)}</p>
</div>
<table class="meta">
  ${r.hospitalName ? `<tr><td class="k">Hospital</td><td class="v">${r.hospitalName}</td></tr>` : ''}
  ${r.hospitalAddress ? `<tr><td class="k">Address</td><td class="v">${r.hospitalAddress}</td></tr>` : ''}
  ${r.doctorName ? `<tr><td class="k">Doctor</td><td class="v">Dr. ${r.doctorName.replace(/^Dr\.?\s*/i, '')}</td></tr>` : ''}
  ${r.patientId ? `<tr><td class="k">Patient ID</td><td class="v">${r.patientId}</td></tr>` : ''}
  <tr><td class="k">Report Type</td><td class="v">${REPORT_TYPE_LABELS[r.reportType]}</td></tr>
  <tr><td class="k">Uploaded</td><td class="v">${uploadedOn}</td></tr>
</table>
${r.notes ? `<div class="notes"><div class="notes-lbl">Notes &amp; Observations</div><div class="notes-txt">${r.notes.replace(/\n/g, '<br/>')}</div></div>` : ''}
${imageHtml}
<div class="footer">Generated by MedVault &nbsp;·&nbsp; ${generatedOn}${r.files.length > 0 ? ` &nbsp;·&nbsp; ${r.files.length} file${r.files.length !== 1 ? 's' : ''} attached` : ''}</div>
</body>
</html>`;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `${r.title}.pdf`,
        UTI: 'com.adobe.pdf',
      });
    } catch {
      Alert.alert('Export Failed', 'Could not generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  async function shareFile(file: MedFile) {
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(file.uri, { mimeType: file.mimeType, dialogTitle: file.name });
    } else {
      Alert.alert('Not available', 'File sharing is not available on this device.');
    }
  }

  function handleDelete() {
    Alert.alert('Delete Report', 'Delete this report and all its files? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteReport(user!.id, reportId);
          navigation.goBack();
        },
      },
    ]);
  }

  if (!report) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Report not found.</Text>
      </View>
    );
  }

  const accentColor = REPORT_TYPE_COLORS[report.reportType] || '#1565C0';
  const typeLabel = REPORT_TYPE_LABELS[report.reportType];
  const imageFiles = report.files.filter((f) => f.type === 'image');
  const videoFiles = report.files.filter((f) => f.type === 'video');
  const docFiles = report.files.filter((f) => f.type !== 'image' && f.type !== 'video');

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header card */}
        <View style={[styles.headerCard, { borderTopColor: accentColor }]}>
          <View style={styles.headerTop}>
            <View style={[styles.badge, { backgroundColor: accentColor + '20' }]}>
              <Text style={[styles.badgeText, { color: accentColor }]}>{typeLabel}</Text>
            </View>
            <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={20} color="#EF5350" />
            </TouchableOpacity>
          </View>
          <Text style={styles.reportTitle}>{report.title}</Text>
          <Text style={styles.reportDate}>{formatDate(report.date)}</Text>

          <View style={styles.metaGrid}>
            {report.hospitalName ? <MetaItem icon="business-outline" value={report.hospitalName} /> : null}
            {report.hospitalAddress ? <MetaItem icon="location-outline" value={report.hospitalAddress} /> : null}
            {report.doctorName ? <MetaItem icon="person-outline" value={`Dr. ${report.doctorName.replace(/^Dr\.?\s*/i, '')}`} /> : null}
            {report.patientId ? <MetaItem icon="card-outline" value={`Patient ID: ${report.patientId}`} /> : null}
          </View>

          {report.notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Notes</Text>
              <Text style={styles.notesText}>{report.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Images */}
        {imageFiles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Images ({imageFiles.length})</Text>
            <Text style={styles.sectionHint}>Tap to view · Pinch to zoom · Double-tap to reset</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
              {imageFiles.map((f) => (
                <TouchableOpacity key={f.id} onPress={() => setPreviewFile(f)} activeOpacity={0.85}>
                  <Image source={{ uri: f.uri }} style={styles.thumbnail} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Videos */}
        {videoFiles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Videos ({videoFiles.length})</Text>
            {videoFiles.map((f) => (
              <VideoPlayer key={f.id} file={f} onShare={() => shareFile(f)} />
            ))}
          </View>
        )}

        {/* Documents */}
        {docFiles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Documents ({docFiles.length})</Text>
            {docFiles.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={styles.fileRow}
                onPress={() => navigation.navigate('FileViewer', { fileUri: f.uri, fileType: f.type, fileName: f.name })}
                onLongPress={() => shareFile(f)}
              >
                <View style={styles.fileIconBox}>
                  <Text style={styles.fileEmoji}>{fileEmoji(f.type)}</Text>
                </View>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>{f.name}</Text>
                  <Text style={styles.fileSize}>{formatSize(f.size)} · {f.type.toUpperCase()}</Text>
                </View>
                <TouchableOpacity onPress={() => shareFile(f)} style={styles.shareBtn}>
                  <Ionicons name="share-outline" size={18} color="#1565C0" />
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={18} color="#BDBDBD" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Full-screen image preview with pinch-to-zoom */}
      <Modal visible={!!previewFile && previewFile.type === 'image'} transparent animationType="fade" onRequestClose={() => setPreviewFile(null)}>
        <View style={styles.previewOverlay}>
          <StatusBar hidden />
          <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewFile(null)}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          {previewFile && (
            <>
              <ZoomableImage uri={previewFile.uri} />
              <View style={styles.previewFooter}>
                <Text style={styles.previewName} numberOfLines={1}>{previewFile.name}</Text>
                <TouchableOpacity onPress={() => shareFile(previewFile)}>
                  <Ionicons name="share-outline" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>
    </>
  );
}

// Pinch-to-zoom + double-tap reset
function ZoomableImage({ uri }: { uri: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const savedScale = useRef(1);
  const pinchRef = useRef(null);
  const doubleTapRef = useRef(null);

  const onPinchEvent = Animated.event(
    [{ nativeEvent: { scale } }],
    { useNativeDriver: true }
  );

  function onPinchStateChange(e: any) {
    if (e.nativeEvent.oldState === State.ACTIVE) {
      savedScale.current = Math.max(1, Math.min(5, savedScale.current * e.nativeEvent.scale));
      scale.setValue(savedScale.current);
    }
  }

  function onDoubleTap(e: any) {
    if (e.nativeEvent.state === State.ACTIVE) {
      savedScale.current = 1;
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    }
  }

  return (
    <View style={styles.zoomWrapper}>
      <TapGestureHandler ref={doubleTapRef} numberOfTaps={2} onHandlerStateChange={onDoubleTap}>
        <Animated.View style={{ flex: 1 }}>
          <PinchGestureHandler
            ref={pinchRef}
            onGestureEvent={onPinchEvent}
            onHandlerStateChange={onPinchStateChange}
            simultaneousHandlers={doubleTapRef}
          >
            <Animated.View style={[styles.zoomContainer, { transform: [{ scale }] }]}>
              <Image source={{ uri }} style={styles.previewImage} resizeMode="contain" />
            </Animated.View>
          </PinchGestureHandler>
        </Animated.View>
      </TapGestureHandler>
      <Text style={styles.zoomHint}>Pinch to zoom · Double-tap to reset</Text>
    </View>
  );
}

function VideoPlayer({ file, onShare }: { file: MedFile; onShare: () => void }) {
  const player = useVideoPlayer(file.uri, (p) => { p.loop = false; });
  return (
    <View style={styles.videoCard}>
      <VideoView
        player={player}
        style={styles.videoPlayer}
        contentFit="contain"
        allowsFullscreen
        nativeControls
      />
      <View style={styles.videoFooter}>
        <Ionicons name="videocam-outline" size={16} color="#9E9E9E" style={{ marginRight: 6 }} />
        <Text style={styles.videoName} numberOfLines={1}>{file.name}</Text>
        <TouchableOpacity onPress={onShare}>
          <Ionicons name="share-outline" size={18} color="#1565C0" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MetaItem({ icon, value }: { icon: keyof typeof Ionicons.glyphMap; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={15} color="#757575" style={{ marginRight: 6, marginTop: 1 }} />
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function formatDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function formatSize(bytes: number): string {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
  content: { padding: 16, paddingBottom: 40 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { color: '#9E9E9E', fontSize: 16 },
  // Header buttons — pill style so they're always visible
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginLeft: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  headerBtnLabel: { color: '#1565C0', fontSize: 12, fontWeight: '700' },
  // Detail card
  headerCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, borderTopWidth: 4, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, marginBottom: 14 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  deleteBtn: { padding: 4 },
  reportTitle: { fontSize: 18, fontWeight: '700', color: '#212121', marginBottom: 4 },
  reportDate: { fontSize: 13, color: '#757575', marginBottom: 12 },
  metaGrid: { gap: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'flex-start' },
  metaValue: { flex: 1, fontSize: 14, color: '#424242', lineHeight: 20 },
  notesBox: { marginTop: 12, backgroundColor: '#F5F7FA', borderRadius: 8, padding: 10 },
  notesLabel: { fontSize: 11, fontWeight: '700', color: '#9E9E9E', marginBottom: 4, textTransform: 'uppercase' },
  notesText: { fontSize: 14, color: '#424242', lineHeight: 20 },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#424242', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionHint: { fontSize: 11, color: '#9E9E9E', marginTop: 2, marginBottom: 10 },
  thumbRow: { marginTop: 4 },
  thumbnail: { width: 130, height: 130, borderRadius: 10, marginRight: 10 },
  videoCard: { backgroundColor: '#0D0D0D', borderRadius: 12, overflow: 'hidden', marginTop: 10, marginBottom: 4 },
  videoPlayer: { width: '100%', height: 220 },
  videoFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, backgroundColor: '#111' },
  videoName: { flex: 1, color: '#ddd', fontSize: 12, marginRight: 8 },
  fileRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  fileIconBox: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  fileEmoji: { fontSize: 20 },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '500', color: '#212121' },
  fileSize: { fontSize: 12, color: '#9E9E9E', marginTop: 2 },
  shareBtn: { padding: 6, marginRight: 4 },
  // Zoom modal
  previewOverlay: { flex: 1, backgroundColor: '#000' },
  previewClose: { position: 'absolute', top: 52, right: 20, zIndex: 10, padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
  zoomWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  zoomContainer: { width: W, height: H * 0.78, alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: W, height: H * 0.78 },
  zoomHint: { position: 'absolute', bottom: 80, color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  previewFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 36, backgroundColor: 'rgba(0,0,0,0.6)' },
  previewName: { flex: 1, color: '#ccc', fontSize: 12, marginRight: 16 },
});
