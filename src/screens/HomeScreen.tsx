import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, RefreshControl, StatusBar, Alert, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme, AppTheme } from '../context/ThemeContext';
import { getReports, deleteReport } from '../services/storageService';
import { MedReport, ReportType, REPORT_TYPE_LABELS, REPORT_TYPE_COLORS } from '../types';
import { STARRED_KEY } from './StarredReportsScreen';

type Props = { navigation: any };

const TYPE_FILTERS: Array<{ key: ReportType | 'all'; label: string }> = [
  { key: 'all', label: 'All Reports' },
  { key: 'blood_test', label: 'Blood Test' },
  { key: 'ecg', label: 'ECG / Heart' },
  { key: 'xray', label: 'X-Ray' },
  { key: 'mri', label: 'MRI' },
  { key: 'ct_scan', label: 'CT Scan' },
  { key: 'ultrasound', label: 'Ultrasound' },
  { key: 'prescription', label: 'Prescription' },
  { key: 'discharge_summary', label: 'Discharge Summary' },
  { key: 'vaccination', label: 'Vaccination' },
  { key: 'other', label: 'Other' },
];

const FILTER_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  all: 'apps-outline',
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

const FILTER_COLORS: Record<string, string> = {
  all: '#1565C0',
  blood_test: '#E53935',
  ecg: '#D81B60',
  xray: '#5E35B1',
  mri: '#3949AB',
  ct_scan: '#00897B',
  ultrasound: '#039BE5',
  prescription: '#43A047',
  discharge_summary: '#FB8C00',
  vaccination: '#8E24AA',
  other: '#757575',
};

export default function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { theme: t } = useTheme();
  const flatListRef = useRef<FlatList<MedReport>>(null);
  const [reports, setReports] = useState<MedReport[]>([]);
  const [starredIds, setStarredIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ReportType | 'all'>('all');
  const [typeFilterOpen, setTypeFilterOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [data, json] = await Promise.all([
      getReports(user.id),
      AsyncStorage.getItem(STARRED_KEY(user.id)),
    ]);
    setReports(data);
    setStarredIds(json ? JSON.parse(json) : []);
  }, [user]);

  useFocusEffect(useCallback(() => {
    load();
    setSearch('');
    setActiveFilter('all');
    setTypeFilterOpen(false);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [load]));

  async function toggleStar(reportId: string) {
    if (!user) return;
    const updated = starredIds.includes(reportId)
      ? starredIds.filter(id => id !== reportId)
      : [...starredIds, reportId];
    setStarredIds(updated);
    await AsyncStorage.setItem(STARRED_KEY(user.id), JSON.stringify(updated));
  }

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function handleDelete(report: MedReport) {
    Alert.alert('Delete Report', `Delete "${report.title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteReport(user!.id, report.id); load(); } },
    ]);
  }

  const filtered = reports.filter((r) => {
    const matchesType = activeFilter === 'all' || r.reportType === activeFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      r.title.toLowerCase().includes(q) ||
      r.hospitalName.toLowerCase().includes(q) ||
      r.doctorName.toLowerCase().includes(q) ||
      REPORT_TYPE_LABELS[r.reportType].toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  const styles = makeStyles(t);
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1565C0" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Reports</Text>
          <Text style={styles.headerSub}>
            {reports.length === 0 ? 'No reports yet' : `${reports.length} report${reports.length !== 1 ? 's' : ''} stored`}
          </Text>
        </View>
        <View style={styles.headerCount}>
          <Text style={styles.countNum}>{reports.length}</Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1565C0" />}
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={10}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Search */}
            <View style={styles.searchRow}>
              <Ionicons name="search" size={18} color="#9E9E9E" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search reports, hospital, doctor..."
                placeholderTextColor="#9E9E9E"
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={18} color="#9E9E9E" />
                </TouchableOpacity>
              )}
            </View>

            {/* Filter dropdown — same inline grid as Add/Edit report type */}
            <TouchableOpacity
              style={[styles.filterTrigger, activeFilter !== 'all' && styles.filterTriggerActive]}
              onPress={() => setTypeFilterOpen(p => !p)}
              activeOpacity={0.75}
            >
              <View style={styles.filterTriggerRow}>
                <View style={[styles.filterTriggerIconBox, { backgroundColor: FILTER_COLORS[activeFilter] + '22' }]}>
                  <Ionicons name={FILTER_ICONS[activeFilter]} size={18} color={FILTER_COLORS[activeFilter]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.filterTriggerLabel}>
                    {TYPE_FILTERS.find(f => f.key === activeFilter)?.label ?? 'All Reports'}
                  </Text>
                  {activeFilter !== 'all' && (
                    <Text style={styles.filterTriggerSub}>
                      {filtered.length} report{filtered.length !== 1 ? 's' : ''} found
                    </Text>
                  )}
                </View>
                {activeFilter !== 'all' && (
                  <TouchableOpacity
                    onPress={() => { setActiveFilter('all'); setTypeFilterOpen(false); }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={20} color={t.textMuted} />
                  </TouchableOpacity>
                )}
                <Ionicons name={typeFilterOpen ? 'chevron-up' : 'chevron-down'} size={18} color={t.textMuted} style={{ marginLeft: 6 }} />
              </View>
            </TouchableOpacity>

            {typeFilterOpen && (
              <View style={styles.typeGrid}>
                {TYPE_FILTERS.map(item => {
                  const isSelected = activeFilter === item.key;
                  const color = FILTER_COLORS[item.key];
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[styles.typeGridItem, isSelected && styles.typeGridItemSelected]}
                      onPress={() => { setActiveFilter(item.key); setTypeFilterOpen(false); }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.typeGridIcon, { backgroundColor: isSelected ? color + '33' : color + '18' }]}>
                        <Ionicons name={FILTER_ICONS[item.key]} size={20} color={color} />
                      </View>
                      <Text
                        style={[styles.typeGridLabel, isSelected && { color: '#1565C0' }]}
                        numberOfLines={2}
                        adjustsFontSizeToFit
                        minimumFontScale={0.75}
                      >
                        {item.label}
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

            {filtered.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="folder-open-outline" size={64} color="#BDBDBD" />
                <Text style={styles.emptyTitle}>
                  {reports.length === 0 ? 'No reports yet' : 'No matching reports'}
                </Text>
                <Text style={styles.emptySub}>
                  {reports.length === 0
                    ? 'Tap Add Report below to get started'
                    : 'Try a different search or filter'}
                </Text>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <ReportCard
            report={item}
            starred={starredIds.includes(item.id)}
            onPress={() => navigation.navigate('ReportDetail', { reportId: item.id })}
            onDelete={() => handleDelete(item)}
            onStar={() => toggleStar(item.id)}
          />
        )}
      />
    </View>
  );
}

function ReportCard({ report, starred, onPress, onDelete, onStar }: {
  report: MedReport; starred: boolean;
  onPress: () => void; onDelete: () => void; onStar: () => void;
}) {
  const { theme: t } = useTheme();
  const styles = makeStyles(t);
  const color = REPORT_TYPE_COLORS[report.reportType] || '#1565C0';
  const label = report.reportType === 'other' && report.otherTypeName ? report.otherTypeName : REPORT_TYPE_LABELS[report.reportType];
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} onLongPress={onDelete} activeOpacity={0.85}>
      <View style={[styles.cardAccent, { backgroundColor: color }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={[styles.badge, { backgroundColor: color + '20' }]}>
            <Text style={[styles.badgeText, { color }]}>{label}</Text>
          </View>
          <View style={styles.cardTopRight}>
            <TouchableOpacity onPress={onStar} style={styles.starBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name={starred ? 'star' : 'star-outline'} size={18} color={starred ? '#FB8C00' : '#BDBDBD'} />
            </TouchableOpacity>
            <Text style={styles.cardDate}>{formatDate(report.date)}</Text>
          </View>
        </View>
        <Text style={styles.cardTitle} numberOfLines={1}>{report.title}</Text>
        {report.hospitalName ? (
          <Text style={styles.cardMeta} numberOfLines={1}>
            <Ionicons name="business-outline" size={12} color="#757575" /> {report.hospitalName}
          </Text>
        ) : null}
        {report.doctorName ? (
          <Text style={styles.cardMeta} numberOfLines={1}>
            <Ionicons name="person-outline" size={12} color="#757575" /> {report.doctorName}
          </Text>
        ) : null}
        <View style={styles.cardFooter}>
          <Text style={styles.fileCount}>
            <Ionicons name="attach" size={12} color="#9E9E9E" /> {report.files.length} file{report.files.length !== 1 ? 's' : ''}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#BDBDBD" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function formatDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const makeStyles = (t: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  header: {
    backgroundColor: '#1565C0',
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSub: { color: '#BBDEFB', fontSize: 13, marginTop: 3 },
  headerCount: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  countNum: { color: '#fff', fontSize: 22, fontWeight: '900' },
  listContent: { paddingHorizontal: 16, paddingBottom: 110 },
  searchRow: {
    marginTop: 14,
    marginBottom: 8,
    backgroundColor: t.surface,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: t.text },
  filterTrigger: {
    backgroundColor: t.surface, borderRadius: 12, borderWidth: 1.5,
    borderColor: t.border, paddingVertical: 10, paddingHorizontal: 14,
    marginTop: 6, marginBottom: 6,
  },
  filterTriggerActive: { borderColor: '#1565C0' },
  filterTriggerRow: { flexDirection: 'row', alignItems: 'center' },
  filterTriggerIconBox: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  filterTriggerLabel: { fontSize: 14, fontWeight: '700', color: t.text },
  filterTriggerSub: { fontSize: 11, color: t.textMuted, marginTop: 1 },
  typeGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8,
    padding: 10, backgroundColor: t.surface,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#1565C0',
  },
  typeGridItem: {
    width: '22%', flexGrow: 1, backgroundColor: t.inputBg,
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 4,
    alignItems: 'center', gap: 6, borderWidth: 1.5,
    borderColor: 'transparent', position: 'relative' as const,
  },
  typeGridItemSelected: { backgroundColor: t.primaryLight, borderColor: '#1565C0' },
  typeGridIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  typeGridLabel: {
    fontSize: 10, fontWeight: '600', color: t.text,
    textAlign: 'center' as const, lineHeight: 13, letterSpacing: -0.1,
  },
  typeGridCheck: { position: 'absolute' as const, top: 4, right: 4 },
  card: {
    backgroundColor: t.surface,
    borderRadius: 14,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardAccent: { width: 5 },
  cardBody: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardTopRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  starBtn: { padding: 2 },
  cardDate: { fontSize: 12, color: t.textMuted },
  cardTitle: { fontSize: 15, fontWeight: '700', color: t.text, marginBottom: 4 },
  cardMeta: { fontSize: 12, color: t.textSecondary, marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  fileCount: { fontSize: 12, color: t.textMuted },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: t.text, marginTop: 12, marginBottom: 8 },
  emptySub: { fontSize: 14, color: t.textMuted, textAlign: 'center', lineHeight: 20 },
});
