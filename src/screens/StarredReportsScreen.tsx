import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getReports } from '../services/storageService';
import { MedReport, REPORT_TYPE_COLORS, REPORT_TYPE_LABELS } from '../types';

export const STARRED_KEY = (uid: string) => `@medvault_starred_${uid}`;

type Props = { navigation: any };

export default function StarredReportsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [starredReports, setStarredReports] = useState<MedReport[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const [reports, json] = await Promise.all([
      getReports(user.id),
      AsyncStorage.getItem(STARRED_KEY(user.id)),
    ]);
    const ids: string[] = json ? JSON.parse(json) : [];
    setStarredReports(reports.filter(r => ids.includes(r.id)));
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function unstar(reportId: string) {
    if (!user) return;
    const json = await AsyncStorage.getItem(STARRED_KEY(user.id));
    const ids: string[] = json ? JSON.parse(json) : [];
    const updated = ids.filter(id => id !== reportId);
    await AsyncStorage.setItem(STARRED_KEY(user.id), JSON.stringify(updated));
    setStarredReports(prev => prev.filter(r => r.id !== reportId));
  }

  if (starredReports.length === 0) {
    return (
      <View style={s.emptyContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1565C0" />
        <Text style={s.emptyIcon}>⭐</Text>
        <Text style={s.emptyTitle}>No starred reports</Text>
        <Text style={s.emptySub}>
          Tap the ★ on any report in My Reports to star it here.
        </Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1565C0" />
      <FlatList
        data={starredReports}
        keyExtractor={r => r.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={s.countLine}>
            {starredReports.length} starred report{starredReports.length !== 1 ? 's' : ''}
          </Text>
        }
        renderItem={({ item }) => {
          const color = REPORT_TYPE_COLORS[item.reportType] || '#1565C0';
          return (
            <TouchableOpacity
              style={s.card}
              onPress={() => navigation.navigate('ReportDetail', { reportId: item.id })}
              activeOpacity={0.85}
            >
              <View style={[s.cardAccent, { backgroundColor: color }]} />
              <View style={s.cardBody}>
                <View style={s.cardTop}>
                  <View style={[s.badge, { backgroundColor: color + '20' }]}>
                    <Text style={[s.badgeText, { color }]}>{item.reportType === 'other' && item.otherTypeName ? item.otherTypeName : REPORT_TYPE_LABELS[item.reportType]}</Text>
                  </View>
                  <TouchableOpacity onPress={() => unstar(item.id)} style={s.starBtn}>
                    <Ionicons name="star" size={18} color="#FB8C00" />
                  </TouchableOpacity>
                </View>
                <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
                {item.hospitalName ? (
                  <Text style={s.cardMeta} numberOfLines={1}>
                    🏥 {item.hospitalName}
                  </Text>
                ) : null}
                <Text style={s.cardDate}>
                  {new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  list: { padding: 16, paddingBottom: 40 },
  countLine: {
    fontSize: 12, fontWeight: '700', color: '#9E9E9E',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 14, marginBottom: 12,
    flexDirection: 'row', overflow: 'hidden',
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  cardAccent: { width: 5 },
  cardBody: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  starBtn: { padding: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#212121', marginBottom: 4 },
  cardMeta: { fontSize: 12, color: '#757575', marginTop: 2 },
  cardDate: { fontSize: 12, color: '#9E9E9E', marginTop: 4 },
  emptyContainer: { flex: 1, backgroundColor: '#F5F7FA', alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#424242', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#9E9E9E', textAlign: 'center', lineHeight: 20 },
});
