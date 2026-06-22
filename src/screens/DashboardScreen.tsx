import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, StatusBar, RefreshControl, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getReports } from '../services/storageService';
import { MedReport } from '../types';
import { ALL_QUOTES, QUOTE_FAV_KEY, QuoteItem } from '../constants/quotes';

const W = Dimensions.get('window').width;
const CARD_W = W - 32;

const HEADER_MESSAGES = [
  'Every record you save is a step towards better health.',
  'Your health story, always at your fingertips.',
  'Organised records today means peace of mind tomorrow.',
  'One report at a time — building your health history.',
  'Your records, your health, your power.',
  'Stay on top of your health — you\'ve got this!',
  'Knowledge is health. Keep your records close.',
  'A well-managed health file is truly priceless.',
  'Your future self will thank you for every saved report.',
  'Health is wealth — protect it with your records.',
  'The best doctor gives the least medicines but the best records.',
  'Store it once, access it forever. That\'s the MedVault promise.',
  'Every uploaded report is a victory for your health journey.',
  'Taking charge of your health records is self-care at its finest.',
];

function getDailyHeaderMessage(): string {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const dayOfYear = Math.floor((Date.now() - start.getTime()) / 86400000);
  return HEADER_MESSAGES[dayOfYear % HEADER_MESSAGES.length];
}

function getDailyQuotes(favorites: string[]): QuoteItem[] {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const dayOfYear = Math.floor((Date.now() - start.getTime()) / 86400000);
  const offset = dayOfYear % ALL_QUOTES.length;
  const rotated = [...ALL_QUOTES.slice(offset), ...ALL_QUOTES.slice(0, offset)];
  const favItems = ALL_QUOTES.filter(q => favorites.includes(q.id));
  const daily = rotated.filter(q => !favorites.includes(q.id));
  return [...favItems, ...daily].slice(0, 8);
}

export default function DashboardScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const [reports, setReports] = useState<MedReport[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const quoteScrollRef = useRef<ScrollView>(null);
  const autoScrollPaused = useRef(false);

  const load = useCallback(async () => {
    if (!user) return;
    const data = await getReports(user.id);
    setReports(data);
    setLoading(false);
  }, [user]);

  const loadFavorites = useCallback(async () => {
    const json = await AsyncStorage.getItem(QUOTE_FAV_KEY);
    setFavorites(json ? JSON.parse(json) : []);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([load(), loadFavorites()]);
    setRefreshing(false);
  }, [load, loadFavorites]);

  useFocusEffect(useCallback(() => {
    load();
    loadFavorites();
  }, [load, loadFavorites]));

  const displayQuotes = useMemo(() => getDailyQuotes(favorites), [favorites]);

  useEffect(() => {
    if (displayQuotes.length <= 1) return;
    const timer = setInterval(() => {
      if (!autoScrollPaused.current) {
        setActiveIdx(prev => {
          const next = (prev + 1) % displayQuotes.length;
          quoteScrollRef.current?.scrollTo({ x: CARD_W * next, animated: true });
          return next;
        });
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [displayQuotes.length]);

  async function toggleFavorite(id: string) {
    const updated = favorites.includes(id)
      ? favorites.filter(f => f !== id)
      : [...favorites, id];
    setFavorites(updated);
    await AsyncStorage.setItem(QUOTE_FAV_KEY, JSON.stringify(updated));
  }

  const now = new Date();
  const thisMonth = reports.filter(r => {
    const d = new Date(r.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const typeCounts = reports.reduce<Record<string, number>>((acc, r) => {
    acc[r.reportType] = (acc[r.reportType] || 0) + 1;
    return acc;
  }, {});
  const uniqueHospitals = new Set(reports.map(r => r.hospitalName).filter(Boolean)).size;

  const firstName = user?.name?.split(' ')[0] || 'there';
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long' });

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1565C0" />

      {/* ── Fixed header — never scrolls ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.greeting}>Hello, {firstName} 👋</Text>
          <Text style={s.greetingMsg}>{getDailyHeaderMessage()}</Text>
          <Text style={s.dateText}>{dateStr}</Text>
        </View>
        <View style={s.headerBadge}>
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.badgeNum}>{reports.length}</Text>}
          <Text style={s.badgeLabel}>reports</Text>
        </View>
      </View>

      {/* ── Scrollable content with pull-to-refresh ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1565C0"
            colors={['#1565C0']}
            progressBackgroundColor="#fff"
          />
        }
      >
        {/* ── Quotes carousel ── */}
        <View style={s.quotesWrap}>
          <ScrollView
            ref={quoteScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            scrollEventThrottle={16}
            onScrollBeginDrag={() => { autoScrollPaused.current = true; }}
            onScrollEndDrag={() => { autoScrollPaused.current = false; }}
            onMomentumScrollEnd={e => {
              autoScrollPaused.current = false;
              const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_W);
              setActiveIdx(idx);
            }}
            style={{ width: CARD_W }}
          >
            {displayQuotes.map(item => (
              <View key={item.id} style={[s.quoteCard, { width: CARD_W, borderLeftColor: item.color }]}>
                <View style={s.quoteTop}>
                  <Text style={s.quoteIcon}>{item.icon}</Text>
                  <TouchableOpacity onPress={() => toggleFavorite(item.id)} style={s.favBtn}>
                    <Ionicons
                      name={favorites.includes(item.id) ? 'heart' : 'heart-outline'}
                      size={22}
                      color={favorites.includes(item.id) ? '#E53935' : '#BDBDBD'}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={[s.quoteText, { color: item.color }]}>{item.text}</Text>
                {favorites.includes(item.id) && (
                  <View style={s.savedTag}>
                    <Ionicons name="heart" size={10} color="#E53935" />
                    <Text style={s.savedTagText}>Saved to Profile</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
          {displayQuotes.length > 1 && (
            <View style={s.dots}>
              {displayQuotes.map((_, i) => (
                <View key={i} style={[s.dot, i === activeIdx && s.dotActive]} />
              ))}
            </View>
          )}
        </View>

        {/* ── KPI 2×2 grid ── */}
        <View style={s.kpiCard}>
          <Text style={s.kpiTitle}>Health Overview</Text>
          {loading ? (
            <View style={s.kpiLoading}>
              <ActivityIndicator color="#1565C0" size="small" />
              <Text style={s.kpiLoadingText}>Loading your stats…</Text>
            </View>
          ) : (
            <View style={s.kpiGrid}>
              <KPITile icon="documents-outline" label="Total Reports" value={reports.length} color="#1565C0" />
              <KPITile icon="calendar-outline" label="This Month" value={thisMonth.length} color="#00897B" />
              <KPITile icon="business-outline" label="Hospitals" value={uniqueHospitals} color="#FB8C00" />
              <KPITile icon="grid-outline" label="Report Types" value={Object.keys(typeCounts).length} color="#8E24AA" />
            </View>
          )}
        </View>

        {/* ── My Reports shortcut ── */}
        <TouchableOpacity
          style={s.reportsBtn}
          onPress={() => navigation.navigate('MyReportsTab')}
          activeOpacity={0.85}
        >
          <View style={s.reportsBtnLeft}>
            <View style={s.reportsBtnIcon}>
              <Ionicons name="folder-open" size={22} color="#1565C0" />
            </View>
            <View>
              <Text style={s.reportsBtnTitle}>My Reports</Text>
              <Text style={s.reportsBtnSub}>
                {reports.length === 0
                  ? 'Add your first report to get started'
                  : `${reports.length} report${reports.length !== 1 ? 's' : ''} · Tap to view all`}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9E9E9E" />
        </TouchableOpacity>

        {/* ── Quick Add ── */}
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => navigation.getParent()?.navigate('Upload', {})}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle-outline" size={22} color="#fff" />
          <Text style={s.addBtnText}>Add New Report</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

function KPITile({ icon, label, value, color }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  color: string;
}) {
  const tileW = (W - 32 - 28 - 10) / 2;
  return (
    <View style={[s.kpiTile, { width: tileW, borderLeftColor: color }]}>
      <View style={[s.kpiIconBox, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[s.kpiValue, { color }]}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  scroll: { paddingBottom: 110 },

  // Fixed header
  header: {
    backgroundColor: '#1565C0',
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerLeft: { flex: 1, marginRight: 12 },
  greeting: { color: '#fff', fontSize: 22, fontWeight: '800' },
  greetingMsg: { color: '#BBDEFB', fontSize: 13, marginTop: 2, lineHeight: 18 },
  dateText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4 },
  headerBadge: { alignItems: 'flex-end', minWidth: 56 },
  badgeNum: { color: '#fff', fontSize: 34, fontWeight: '900', lineHeight: 36 },
  badgeLabel: { color: '#BBDEFB', fontSize: 12 },

  // Quotes
  quotesWrap: { marginHorizontal: 16, marginTop: 16 },
  quoteCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderLeftWidth: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    minHeight: 116,
  },
  quoteTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  quoteIcon: { fontSize: 28 },
  favBtn: { padding: 4 },
  quoteText: { fontSize: 15, fontWeight: '600', lineHeight: 23 },
  savedTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  savedTagText: { fontSize: 11, color: '#E53935', fontWeight: '600' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E0E0E0' },
  dotActive: { width: 20, height: 6, borderRadius: 3, backgroundColor: '#1565C0' },

  // KPI
  kpiCard: {
    margin: 16,
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  kpiTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9E9E9E',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  kpiLoadingText: { fontSize: 13, color: '#9E9E9E' },
  kpiTile: {
    backgroundColor: '#F8FAFE',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
  },
  kpiIconBox: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kpiValue: { fontSize: 28, fontWeight: '900', lineHeight: 30 },
  kpiLabel: { fontSize: 11, color: '#9E9E9E', marginTop: 3, fontWeight: '500' },

  // My Reports shortcut
  reportsBtn: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  reportsBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  reportsBtnIcon: {
    width: 46, height: 46, borderRadius: 13,
    backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center',
  },
  reportsBtnTitle: { fontSize: 15, fontWeight: '700', color: '#212121' },
  reportsBtnSub: { fontSize: 12, color: '#9E9E9E', marginTop: 2 },

  // Add button
  addBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#1565C0',
    borderRadius: 14,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
