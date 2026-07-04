import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  AppState,
  Dimensions,
  Modal,
  Platform,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme, AppTheme } from '../context/ThemeContext';
import { getReports, deleteReport } from '../services/storageService';
import { cancelVisitNotifications } from '../services/notificationService';
import { MedFile, MedReport, REPORT_TYPE_COLORS, REPORT_TYPE_LABELS } from '../types';
import { hapticSuccess } from '../utils/haptics';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'ReportDetail'>;
  route: RouteProp<MainStackParamList, 'ReportDetail'>;
};

const { width: W, height: H } = Dimensions.get('window');

export default function ReportDetailScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const { theme: t } = useTheme();
  const { reportId } = route.params;
  const [report, setReport] = useState<MedReport | null>(null);
  const [previewFile, setPreviewFile] = useState<MedFile | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const previewListRef = useRef<FlatList<MedFile>>(null);
  const [sharingLoading, setSharingLoading] = useState(false);

  const onPreviewViewable = useRef(({ viewableItems }: { viewableItems: any[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setPreviewIndex(viewableItems[0].index);
    }
  }).current;
  const [sharedToast, setSharedToast] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;

  function showShareToast() {
    hapticSuccess();
    setSharedToast(true);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.spring(toastAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setSharedToast(false));
  }

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
      { text: 'Share as PDF', onPress: () => shareAsPDF(report) },
    ]);
  }, [report]);

  useEffect(() => {
    if (!report) return;
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 6, marginRight: 4 }}>
          <TouchableOpacity onPress={handleSharePrompt} disabled={sharingLoading} style={styles.headerBtn}>
            <Ionicons name="share-social-outline" size={18} color="#1565C0" />
            <Text style={styles.headerBtnLabel}>Share</Text>
          </TouchableOpacity>
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
  }, [report, sharingLoading, handleSharePrompt]);

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

    if (Platform.OS === 'web') {
      try {
        if ((navigator as any).share) {
          await (navigator as any).share({ title: r.title, text: lines });
          showShareToast();
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(lines);
          showShareToast();
        }
      } catch {
        // user cancelled
      }
      return;
    }

    const result = await Share.share({ message: lines, title: r.title });
    // On iOS: dismissedAction = cancel, sharedAction = shared.
    // On Android: sharedAction always, activityType is set only on actual share.
    const didShare = result.action === Share.sharedAction &&
      (Platform.OS === 'ios' ? true : !!result.activityType);
    if (didShare) showShareToast();
  }

  async function shareAsPDF(r: MedReport) {
    setSharingLoading(true);
    try {
      const accent = REPORT_TYPE_COLORS[r.reportType] || '#1565C0';
      const imageFiles = r.files.filter((f) => f.type === 'image');
      const otherFiles = r.files.filter((f) => f.type !== 'image');

      // Build base64 image blocks — each image on its own page
      let imageHtml = '';
      if (imageFiles.length > 0) {
        const pages = await Promise.all(imageFiles.map(async (f) => {
          try {
            // f.uri is an HTTP URL — download to local cache before reading
            const tempPath = (LegacyFS.cacheDirectory ?? '') + `mv_img_${f.id}`;
            await LegacyFS.downloadAsync(f.uri, tempPath);
            const b64 = await LegacyFS.readAsStringAsync(tempPath, { encoding: LegacyFS.EncodingType.Base64 });
            const mime = f.mimeType || 'image/jpeg';
            return `<div class="img-page"><img src="data:${mime};base64,${b64}" class="img-full" /><p class="img-cap">${f.name}</p></div>`;
          } catch { return `<div class="img-page"><p class="img-cap">${f.name} — unavailable</p></div>`; }
        }));
        imageHtml = `
<div class="img-section-hdr">Attached Images &nbsp;<span class="sec-count">${imageFiles.length}</span></div>
${pages.join('\n')}`;
      }

      // Documents — embed PDFs as base64, list others in table
      let filesHtml = '';
      if (otherFiles.length > 0) {
        const pdfFiles = otherFiles.filter(f => f.type === 'pdf');
        const nonPdfFiles = otherFiles.filter(f => f.type !== 'pdf');

        let pdfHtml = '';
        if (pdfFiles.length > 0) {
          const blocks = await Promise.all(pdfFiles.map(async (f) => {
            const size = f.size < 1024 ? `${f.size} B` : f.size < 1048576 ? `${(f.size/1024).toFixed(1)} KB` : `${(f.size/1048576).toFixed(1)} MB`;
            try {
              const tempPath = (LegacyFS.cacheDirectory ?? '') + `mv_pdf_${f.id}.pdf`;
              const info = await LegacyFS.getInfoAsync(tempPath);
              if (!info.exists) await LegacyFS.downloadAsync(f.uri, tempPath);
              const b64 = await LegacyFS.readAsStringAsync(tempPath, { encoding: LegacyFS.EncodingType.Base64 });
              return `
<div class="pdf-block">
  <div class="pdf-block-hdr"><span>📄 ${f.name}</span><span class="pdf-block-meta">${size}</span></div>
  <iframe src="data:application/pdf;base64,${b64}" width="100%" height="1050px" style="border:none;display:block;" frameborder="0"></iframe>
</div>`;
            } catch {
              return `
<div class="pdf-block">
  <div class="pdf-block-hdr"><span>📄 ${f.name}</span><span class="pdf-block-meta">${size} · unavailable</span></div>
</div>`;
            }
          }));
          pdfHtml = `
<div class="sec-hdr">Attached Documents &nbsp;<span class="sec-count">${pdfFiles.length}</span></div>
${blocks.join('\n')}`;
        }

        let tableHtml = '';
        if (nonPdfFiles.length > 0) {
          const rows = nonPdfFiles.map(f => {
            const emoji = f.type === 'video' ? '🎥' : '🩻';
            const size = f.size < 1024 ? `${f.size} B` : f.size < 1048576 ? `${(f.size/1024).toFixed(1)} KB` : `${(f.size/1048576).toFixed(1)} MB`;
            return `<tr><td class="f-icon">${emoji}</td><td class="f-name">${f.name}</td><td class="f-meta">${f.type.toUpperCase()}</td><td class="f-meta">${size}</td></tr>`;
          }).join('');
          tableHtml = `
<div class="sec-hdr">Other Attachments &nbsp;<span class="sec-count">${nonPdfFiles.length}</span></div>
<table class="files-tbl"><tbody>${rows}</tbody></table>`;
        }

        filesHtml = pdfHtml + tableHtml;
      }

      const uploadedOn = new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
      const generatedOn = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const visitDate = r.nextVisitDate ? new Date(r.nextVisitDate).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;

      const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>
  @page { margin: 14mm 12mm; size: A4; }
  *{ box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body{ font-family: Helvetica, Arial, sans-serif; color: #1A1A1A; font-size: 13px; line-height: 1.6; margin:0; padding:0; }

  /* ── Header ── */
  .hdr{ display:flex; align-items:flex-start; justify-content:space-between; border-bottom:3px solid ${accent}; padding-bottom:14px; margin-bottom:20px; page-break-inside:avoid; }
  .hdr-left h1{ color:${accent}; font-size:20px; margin:4px 0 2px; }
  .hdr-left .date{ color:#666; font-size:12px; }
  .hdr-right{ text-align:right; }
  .badge{ display:inline-block; padding:4px 12px; border-radius:20px; font-size:11px; font-weight:700; background:${accent}22; color:${accent}; }
  .brand{ font-size:11px; color:#BDBDBD; margin-top:6px; font-weight:600; letter-spacing:1px; }

  /* ── Meta table ── */
  table.meta{ width:100%; border-collapse:collapse; margin:0 0 16px; page-break-inside:avoid; }
  table.meta td{ padding:9px 12px; vertical-align:top; border:1px solid #E8E8E8; }
  table.meta .k{ background:#F5F7FA; color:#555; font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:0.4px; width:130px; white-space:nowrap; }
  table.meta .v{ color:#1A1A1A; font-size:13px; }

  /* ── Notes ── */
  .notes{ background:#F0F7FF; border-left:4px solid ${accent}; padding:10px 14px; margin:0 0 18px; page-break-inside:avoid; border-radius:0 6px 6px 0; }
  .notes-lbl{ font-size:10px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:5px; }
  .notes-txt{ color:#333; font-size:13px; line-height:1.6; white-space:pre-wrap; }

  /* ── Next visit banner ── */
  .visit-banner{ display:flex; align-items:center; background:${accent}11; border:1.5px solid ${accent}44; border-radius:8px; padding:10px 14px; margin:0 0 18px; page-break-inside:avoid; }
  .visit-banner .v-lbl{ font-size:10px; font-weight:700; color:${accent}; text-transform:uppercase; letter-spacing:0.6px; }
  .visit-banner .v-date{ font-size:14px; font-weight:700; color:${accent}; margin-top:2px; }

  /* ── Section headers ── */
  .sec-hdr{ font-size:11px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:1px; margin:20px 0 10px; padding-bottom:5px; border-bottom:1.5px solid #E0E0E0; page-break-after:avoid; }
  .sec-count{ background:#E0E0E0; color:#555; border-radius:10px; padding:1px 7px; font-size:10px; font-weight:700; }

  /* ── Images — one image per page, no splitting ── */
  .img-section-hdr{ font-size:11px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:1px; margin:20px 0 10px; padding-bottom:5px; border-bottom:1.5px solid #E0E0E0; page-break-after:avoid; break-after:avoid; }
  .img-page{ page-break-before:always; break-before:page; page-break-inside:avoid; break-inside:avoid; display:block; text-align:center; padding-top:10mm; }
  .img-full{ max-width:100%; max-height:220mm; object-fit:contain; display:inline-block; border-radius:6px; border:1px solid #E8E8E8; background:#FAFAFA; }
  .img-cap{ font-size:11px; color:#999; text-align:center; margin:8px 0 0; display:block; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }

  /* ── Other files table ── */
  table.files-tbl{ width:100%; border-collapse:collapse; page-break-inside:avoid; }
  table.files-tbl td{ padding:7px 10px; border-bottom:1px solid #F0F0F0; font-size:12px; vertical-align:middle; }
  .f-icon{ width:28px; font-size:16px; }
  .f-name{ color:#222; font-weight:500; }
  .f-meta{ color:#999; width:80px; text-align:right; }

  /* ── Embedded PDF blocks ── */
  .pdf-block{ page-break-before:always; break-before:page; margin-bottom:10px; }
  .pdf-block-hdr{ display:flex; justify-content:space-between; align-items:center; background:#F5F7FA; border-radius:6px; padding:8px 12px; font-size:13px; font-weight:700; color:#333; margin-bottom:6px; }
  .pdf-block-meta{ font-size:11px; color:#999; font-weight:400; }

  /* ── Footer ── */
  .footer{ text-align:center; color:#BDBDBD; font-size:10px; margin-top:28px; padding-top:10px; border-top:1px solid #E8E8E8; page-break-inside:avoid; }
</style>
</head>
<body>

<div class="hdr">
  <div class="hdr-left">
    <div class="brand">MEDVAULT · MEDICAL RECORD</div>
    <h1>${r.title}</h1>
    <div class="date">Visit Date: ${formatDate(r.date)}</div>
  </div>
  <div class="hdr-right">
    <div class="badge">${REPORT_TYPE_LABELS[r.reportType]}</div>
    <div class="brand" style="margin-top:8px">Uploaded: ${uploadedOn}</div>
  </div>
</div>

<table class="meta">
  ${r.hospitalName    ? `<tr><td class="k">Hospital / Clinic</td><td class="v">${r.hospitalName}</td></tr>` : ''}
  ${r.hospitalAddress ? `<tr><td class="k">Address</td><td class="v">${r.hospitalAddress}</td></tr>` : ''}
  ${r.doctorName      ? `<tr><td class="k">Doctor</td><td class="v">Dr. ${r.doctorName.replace(/^Dr\.?\s*/i, '')}</td></tr>` : ''}
  ${r.patientId       ? `<tr><td class="k">Patient ID</td><td class="v">${r.patientId}</td></tr>` : ''}
  <tr><td class="k">Report Type</td><td class="v">${REPORT_TYPE_LABELS[r.reportType]}${r.otherTypeName ? ` — ${r.otherTypeName}` : ''}</td></tr>
</table>

${r.notes ? `<div class="notes"><div class="notes-lbl">Notes &amp; Observations</div><div class="notes-txt">${r.notes}</div></div>` : ''}

${visitDate ? `<div class="visit-banner"><div><div class="v-lbl">📅 Next Visit / Follow-up</div><div class="v-date">${visitDate}</div></div></div>` : ''}

${imageHtml}
${filesHtml}

<div class="footer">
  Generated by MedVault &nbsp;·&nbsp; ${generatedOn}
  ${r.files.length > 0 ? ` &nbsp;·&nbsp; ${r.files.length} file${r.files.length !== 1 ? 's' : ''} attached` : ''}
</div>
</body>
</html>`;

      const { uri: tempUri } = await Print.printToFileAsync({ html });

      // Rename to Username_ReportType.pdf before sharing
      const safe = (s: string) => s.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
      const fileName = `${safe(user?.name || 'User')}_${safe(REPORT_TYPE_LABELS[r.reportType] || r.reportType)}.pdf`;
      const destUri = (LegacyFS.cacheDirectory ?? '') + fileName;
      await LegacyFS.copyAsync({ from: tempUri, to: destUri });

      setSharingLoading(false); // hide overlay before share sheet opens
      if (Platform.OS === 'ios') {
        // On iOS, Share.share({ url }) returns result.action — reliable signal.
        // 'sharedAction' = user picked a target; 'dismissedAction' = cancel.
        const result = await Share.share({ url: destUri, title: fileName });
        if (result.action === Share.sharedAction) showShareToast();
      } else {
        // Android: Sharing.shareAsync resolves on dismiss (no result).
        // App goes 'background' when the target app opens — use AppState.
        // Keep the listener for 1500ms to catch the late background event.
        let wentBackground = false;
        const stateSub = AppState.addEventListener('change', (s) => {
          if (s === 'background') wentBackground = true;
        });
        await Sharing.shareAsync(destUri, {
          mimeType: 'application/pdf',
          dialogTitle: fileName,
          UTI: 'com.adobe.pdf',
        });
        await new Promise(r => setTimeout(r, 1500));
        stateSub.remove();
        if (wentBackground) showShareToast();
      }
    } catch {
      Alert.alert('Export Failed', 'Could not generate PDF. Please try again.');
    } finally {
      setSharingLoading(false);
    }
  }

  async function shareFile(file: MedFile) {
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert('Not available', 'File sharing is not available on this device.');
      return;
    }
    setSharingLoading(true);
    try {
      let localUri = file.uri;
      if (file.uri.startsWith('http')) {
        const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : '';
        const tempPath = (LegacyFS.cacheDirectory ?? '') + `mv_share_${file.id}${ext}`;
        const info = await LegacyFS.getInfoAsync(tempPath);
        if (!info.exists) {
          await LegacyFS.downloadAsync(file.uri, tempPath);
        }
        localUri = tempPath;
      }
      setSharingLoading(false); // hide overlay before share sheet opens
      if (Platform.OS === 'ios') {
        const result = await Share.share({ url: localUri, title: file.name });
        if (result.action === Share.sharedAction) showShareToast();
      } else {
        let wentBackground = false;
        const stateSub = AppState.addEventListener('change', (s) => {
          if (s === 'background') wentBackground = true;
        });
        await Sharing.shareAsync(localUri, { mimeType: file.mimeType, dialogTitle: file.name });
        await new Promise(r => setTimeout(r, 1500));
        stateSub.remove();
        if (wentBackground) showShareToast();
      }
    } finally {
      setSharingLoading(false);
    }
  }

  function handleDelete() {
    Alert.alert('Delete Report', 'Delete this report and all its files? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (report?.visitNotificationIds?.length) {
            await cancelVisitNotifications(report.visitNotificationIds);
          }
          await deleteReport(user!.id, reportId);
          navigation.goBack();
        },
      },
    ]);
  }

  const { bottom: bottomInset } = useSafeAreaInsets();
  const styles = makeStyles(t, bottomInset);
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

          {report.nextVisitDate ? (
            <View style={styles.visitBanner}>
              <Ionicons name="calendar" size={16} color="#1565C0" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.visitBannerLabel}>Next Visit / Follow-up</Text>
                <Text style={styles.visitBannerDate}>{formatVisitDate(new Date(report.nextVisitDate))}</Text>
              </View>
              <Ionicons name="notifications" size={16} color="#1565C0" />
            </View>
          ) : null}
        </View>

        {/* Images */}
        {imageFiles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Images ({imageFiles.length})</Text>
            <Text style={styles.sectionHint}>Tap to view · Swipe to browse · Pinch to zoom</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
              {imageFiles.map((f, idx) => (
                <TouchableOpacity key={f.id} onPress={() => { setPreviewIndex(idx); setPreviewFile(f); }} activeOpacity={0.85}>
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
                <TouchableOpacity
                  onPress={() => shareFile(f)}
                  disabled={sharingLoading}
                  style={styles.shareBtn}
                >
                  <Ionicons name="share-outline" size={18} color="#1565C0" />
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={18} color="#BDBDBD" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Full-screen image preview — swipe left/right between images */}
      <Modal visible={!!previewFile && previewFile.type === 'image'} transparent animationType="fade" onRequestClose={() => setPreviewFile(null)}>
        <View style={styles.previewOverlay}>
          <StatusBar hidden />
          <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewFile(null)}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>

          {imageFiles.length > 1 && (
            <Text style={styles.previewCounter}>{previewIndex + 1} / {imageFiles.length}</Text>
          )}

          <FlatList
            ref={previewListRef}
            data={imageFiles}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            initialScrollIndex={previewIndex}
            getItemLayout={(_, index) => ({ length: W, offset: W * index, index })}
            onViewableItemsChanged={onPreviewViewable}
            viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
            renderItem={({ item }) => (
              <View style={{ width: W, flex: 1 }}>
                <ZoomableImage uri={item.uri} />
              </View>
            )}
          />

          <View style={styles.previewFooter}>
            <Text style={styles.previewName} numberOfLines={1}>{imageFiles[previewIndex]?.name ?? ''}</Text>
            <TouchableOpacity
              onPress={() => imageFiles[previewIndex] && shareFile(imageFiles[previewIndex])}
              disabled={sharingLoading}
            >
              <Ionicons name="share-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {imageFiles.length > 1 && (
            <View style={styles.previewDots}>
              {imageFiles.map((_, i) => (
                <View key={i} style={[styles.previewDot, i === previewIndex && styles.previewDotActive]} />
              ))}
            </View>
          )}
        </View>
      </Modal>

      {/* Centered sharing loader — shown for all share operations */}
      {sharingLoading && (
        <View style={styles.sharingOverlay} pointerEvents="none">
          <View style={styles.sharingBox}>
            <ActivityIndicator size="large" color="#1565C0" />
            <Text style={styles.sharingText}>Preparing…</Text>
          </View>
        </View>
      )}

      {/* Share success toast */}
      {sharedToast && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.shareToast,
            {
              opacity: toastAnim,
              transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.shareToastTxt}>Shared successfully!</Text>
        </Animated.View>
      )}
    </>
  );
}

// Pinch-to-zoom + double-tap reset
function ZoomableImage({ uri }: { uri: string }) {
  const { theme: t } = useTheme();
  const styles = makeStyles(t);
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
  const { theme: t } = useTheme();
  const styles = makeStyles(t);
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
  const { theme: t } = useTheme();
  const styles = makeStyles(t);
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

function formatVisitDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    + '  '
    + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
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

const makeStyles = (t: AppTheme, bottomInset: number = 0) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  content: { padding: 16, paddingBottom: 40 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { color: t.textMuted, fontSize: 16 },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: t.surface,
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
  headerCard: { backgroundColor: t.surface, borderRadius: 16, padding: 18, borderTopWidth: 4, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, marginBottom: 14 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  deleteBtn: { padding: 4 },
  reportTitle: { fontSize: 18, fontWeight: '700', color: t.text, marginBottom: 4 },
  reportDate: { fontSize: 13, color: t.textSecondary, marginBottom: 12 },
  metaGrid: { gap: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'flex-start' },
  metaValue: { flex: 1, fontSize: 14, color: t.text, lineHeight: 20 },
  notesBox: { marginTop: 12, backgroundColor: t.inputBg, borderRadius: 8, padding: 10 },
  notesLabel: { fontSize: 11, fontWeight: '700', color: t.textMuted, marginBottom: 4, textTransform: 'uppercase' },
  notesText: { fontSize: 14, color: t.text, lineHeight: 20 },
  visitBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.primaryLight, borderRadius: 10, padding: 12, marginTop: 12 },
  visitBannerLabel: { fontSize: 11, fontWeight: '700', color: '#1565C0', textTransform: 'uppercase', letterSpacing: 0.4 },
  visitBannerDate: { fontSize: 14, fontWeight: '700', color: '#1565C0', marginTop: 2 },
  section: { backgroundColor: t.surface, borderRadius: 14, padding: 14, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: t.text, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionHint: { fontSize: 11, color: t.textMuted, marginTop: 2, marginBottom: 10 },
  thumbRow: { marginTop: 4 },
  thumbnail: { width: 130, height: 130, borderRadius: 10, marginRight: 10 },
  videoCard: { backgroundColor: '#0D0D0D', borderRadius: 12, overflow: 'hidden', marginTop: 10, marginBottom: 4 },
  videoPlayer: { width: '100%', height: 220 },
  videoFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, backgroundColor: '#111' },
  videoName: { flex: 1, color: '#ddd', fontSize: 12, marginRight: 8 },
  fileRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: t.divider },
  fileIconBox: { width: 40, height: 40, borderRadius: 8, backgroundColor: t.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  fileEmoji: { fontSize: 20 },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '500', color: t.text },
  fileSize: { fontSize: 12, color: t.textMuted, marginTop: 2 },
  shareBtn: { padding: 6, marginRight: 4 },
  previewOverlay: { flex: 1, backgroundColor: '#000' },
  previewClose: { position: 'absolute', top: 52, right: 20, zIndex: 10, padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
  zoomWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  zoomContainer: { width: W, height: H * 0.78, alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: W, height: H * 0.78 },
  zoomHint: { position: 'absolute', bottom: 80 + bottomInset, color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  previewCounter: { position: 'absolute', top: 56, alignSelf: 'center', color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700', zIndex: 10, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14 },
  previewFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 36 + bottomInset, backgroundColor: 'rgba(0,0,0,0.6)' },
  previewName: { flex: 1, color: '#ccc', fontSize: 12, marginRight: 16 },
  previewDots: { position: 'absolute', bottom: 82 + bottomInset, alignSelf: 'center', flexDirection: 'row', gap: 6, zIndex: 10 },
  previewDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  previewDotActive: { backgroundColor: '#fff', width: 18, borderRadius: 3 },
  sharingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  sharingBox: { backgroundColor: t.surface, borderRadius: 20, padding: 32, alignItems: 'center', gap: 16, elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 12 },
  sharingText: { color: t.text, fontSize: 15, fontWeight: '600' },
  shareToast: { position: 'absolute', bottom: 32 + bottomInset, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#2E7D32', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 28, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 8 },
  shareToastTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
