import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, RefreshControl, StatusBar, Alert, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getReports, deleteReport } from '../services/storageService';
import { MedReport, ReportType, REPORT_TYPE_LABELS, REPORT_TYPE_COLORS } from '../types';
import { STARRED_KEY } from './StarredReportsScreen';

type Props = { navigation: any };

const TYPE_FILTERS: Array<{ key: ReportType | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'blood_test', label: 'Blood' },
  { key: 'ecg', label: 'ECG' },
  { key: 'xray', label: 'X-Ray' },
  { key: 'mri', label: 'MRI' },
  { key: 'prescription', label: 'Rx' },
  { key: 'ct_scan', label: 'CT' },
  { key: 'ultrasound', label: 'Ultrasound' },
  { key: 'other', label: 'Other' },
];

export default function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [reports, setReports] = useState<MedReport[]>([]);
  const [starredIds, setStarredIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ReportType | 'all'>('all');
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

            {/* Filter chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {TYPE_FILTERS.map(item => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.chip, activeFilter === item.key && styles.chipActive]}
                  onPress={() => setActiveFilter(item.key)}
                >
                  <Text style={[styles.chipText, activeFilter === item.key && styles.chipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
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
    backgroundColor: '#fff',
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
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#212121' },
  filterRow: { paddingVertical: 4, paddingRight: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#E3F2FD', marginRight: 8 },
  chipActive: { backgroundColor: '#1565C0' },
  chipText: { fontSize: 13, color: '#1565C0', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  card: {
    backgroundColor: '#fff',
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
  cardDate: { fontSize: 12, color: '#9E9E9E' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#212121', marginBottom: 4 },
  cardMeta: { fontSize: 12, color: '#757575', marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  fileCount: { fontSize: 12, color: '#9E9E9E' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#424242', marginTop: 12, marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#9E9E9E', textAlign: 'center', lineHeight: 20 },
});
