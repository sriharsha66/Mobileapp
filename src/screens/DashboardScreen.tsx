import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, StatusBar, RefreshControl, ActivityIndicator, Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getReports } from '../services/storageService';
import { MedReport } from '../types';
import { ALL_QUOTES, quoteFavKey, QuoteItem } from '../constants/quotes';
import { useTheme, AppTheme } from '../context/ThemeContext';

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
  const { theme: t } = useTheme();
  const [reports, setReports] = useState<MedReport[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const mainScrollRef = useRef<ScrollView>(null);
  const quoteScrollRef = useRef<ScrollView>(null);
  const autoScrollPaused = useRef(false);
  const waveAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    if (!user) return;
    const data = await getReports(user.id);
    setReports(data);
    setLoading(false);
  }, [user]);

  const loadFavorites = useCallback(async () => {
    if (!user) return;
    const json = await AsyncStorage.getItem(quoteFavKey(user.id));
    setFavorites(json ? JSON.parse(json) : []);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([load(), loadFavorites()]);
    setRefreshing(false);
  }, [load, loadFavorites]);

  const firstName = user?.name?.split(' ')[0] || 'there';

  useFocusEffect(useCallback(() => {
    load();
    loadFavorites();
    mainScrollRef.current?.scrollTo({ y: 0, animated: false });

    // 👋 waves once on every Home tab focus
    waveAnim.setValue(0);
    Animated.sequence([
      Animated.timing(waveAnim, { toValue: 1,     duration: 160, useNativeDriver: true }),
      Animated.timing(waveAnim, { toValue: -0.35, duration: 130, useNativeDriver: true }),
      Animated.timing(waveAnim, { toValue: 1,     duration: 130, useNativeDriver: true }),
      Animated.timing(waveAnim, { toValue: -0.35, duration: 130, useNativeDriver: true }),
      Animated.timing(waveAnim, { toValue: 1,     duration: 130, useNativeDriver: true }),
      Animated.timing(waveAnim, { toValue: 0,     duration: 160, useNativeDriver: true }),
    ]).start();
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
    if (!user) return;
    await AsyncStorage.setItem(quoteFavKey(user.id), JSON.stringify(updated));
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

  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long' });

  const waveRotate = waveAnim.interpolate({
    inputRange: [-0.35, 0, 1],
    outputRange: ['-12deg', '0deg', '30deg'],
  });

  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1565C0" />

      {/* ── Fixed header — never scrolls ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.greetingRow}>
            <Text style={s.greeting}>Hello, {firstName} </Text>
            <Animated.Text style={[s.greetingWave, { transform: [{ rotate: waveRotate }] }]}>👋</Animated.Text>
          </View>
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
        ref={mainScrollRef}
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
            {displayQuotes.map(item => {
              const isFav = favorites.includes(item.id);
              return (
                <View key={item.id} style={[s.quoteCard, { width: CARD_W }]}>
                  {/* Coloured banner — acts as the visual / image area */}
                  <View style={[s.quoteBanner, { backgroundColor: item.color + '1A' }]}>
                    <View style={[s.bannerDeco1, { backgroundColor: item.color + '28' }]} />
                    <View style={[s.bannerDeco2, { backgroundColor: item.color + '1E' }]} />
                    <Text style={s.bannerEmoji}>{item.icon}</Text>
                    <View style={[s.bannerBadge, { backgroundColor: item.color }]}>
                      <Text style={s.bannerBadgeTxt}>{item.category}</Text>
                    </View>
                  </View>
                  {/* Quote text + heart */}
                  <View style={s.quoteBody}>
                    <Text style={[s.quoteText, { color: t.text }]}>"{item.text}"</Text>
                    <View style={s.quoteFooter}>
                      {isFav && (
                        <View style={s.savedTag}>
                          <Ionicons name="heart" size={10} color="#E53935" />
                          <Text style={s.savedTagText}>Saved</Text>
                        </View>
                      )}
                      <TouchableOpacity onPress={() => toggleFavorite(item.id)} style={s.favBtn}>
                        <Ionicons
                          name={isFav ? 'heart' : 'heart-outline'}
                          size={22}
                          color={isFav ? '#E53935' : '#BDBDBD'}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
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
  const { theme: t } = useTheme();
  const tileW = (W - 32 - 28 - 10) / 2;
  return (
    <View style={{ width: tileW, backgroundColor: t.bg, borderRadius: 12, padding: 12, borderLeftWidth: 4, borderLeftColor: color }}>
      <View style={{ width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 8, backgroundColor: color + '18' }}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={{ fontSize: 28, fontWeight: '900', lineHeight: 30, color }}>{value}</Text>
      <Text style={{ fontSize: 11, color: t.textMuted, marginTop: 3, fontWeight: '500' }}>{label}</Text>
    </View>
  );
}

const makeStyles = (t: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  scroll: { paddingBottom: 110 },

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
  greetingRow: { flexDirection: 'row', alignItems: 'center' },
  greeting: { color: '#fff', fontSize: 22, fontWeight: '800' },
  greetingWave: { fontSize: 22 },
  greetingMsg: { color: '#BBDEFB', fontSize: 13, marginTop: 2, lineHeight: 18 },
  dateText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4 },
  headerBadge: { alignItems: 'flex-end', minWidth: 56 },
  badgeNum: { color: '#fff', fontSize: 34, fontWeight: '900', lineHeight: 36 },
  badgeLabel: { color: '#BBDEFB', fontSize: 12 },

  quotesWrap: { marginHorizontal: 16, marginTop: 16 },
  quoteCard: {
    backgroundColor: t.surface,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
  },
  quoteBanner: {
    height: 148,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bannerDeco1: {
    position: 'absolute',
    width: 160, height: 160, borderRadius: 80,
    top: -48, right: -32,
  },
  bannerDeco2: {
    position: 'absolute',
    width: 110, height: 110, borderRadius: 55,
    bottom: -36, left: -22,
  },
  bannerEmoji: { fontSize: 64 },
  bannerBadge: {
    position: 'absolute',
    bottom: 10, right: 12,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  bannerBadgeTxt: {
    fontSize: 10, fontWeight: '700', color: '#fff',
    textTransform: 'uppercase', letterSpacing: 0.6,
  } as any,
  quoteBody: { padding: 16, paddingTop: 12 },
  quoteText: { fontSize: 14, fontWeight: '600', lineHeight: 22, fontStyle: 'italic' } as any,
  quoteFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 10, gap: 6 },
  favBtn: { padding: 4 },
  savedTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  savedTagText: { fontSize: 11, color: '#E53935', fontWeight: '600' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: t.border },
  dotActive: { width: 20, height: 6, borderRadius: 3, backgroundColor: '#1565C0' },

  kpiCard: {
    margin: 16,
    marginTop: 16,
    backgroundColor: t.surface,
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
    color: t.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  kpiLoadingText: { fontSize: 13, color: t.textMuted },

  reportsBtn: {
    marginHorizontal: 16,
    backgroundColor: t.surface,
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
    backgroundColor: t.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  reportsBtnTitle: { fontSize: 15, fontWeight: '700', color: t.text },
  reportsBtnSub: { fontSize: 12, color: t.textMuted, marginTop: 2 },

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
