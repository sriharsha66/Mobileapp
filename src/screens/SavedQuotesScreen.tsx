import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ALL_QUOTES, QUOTE_FAV_KEY } from '../constants/quotes';

export default function SavedQuotesScreen() {
  const [favIds, setFavIds] = useState<string[]>([]);

  const loadFavs = useCallback(async () => {
    const json = await AsyncStorage.getItem(QUOTE_FAV_KEY);
    setFavIds(json ? JSON.parse(json) : []);
  }, []);

  useFocusEffect(useCallback(() => { loadFavs(); }, [loadFavs]));

  async function removeFavorite(id: string) {
    const updated = favIds.filter(f => f !== id);
    setFavIds(updated);
    await AsyncStorage.setItem(QUOTE_FAV_KEY, JSON.stringify(updated));
  }

  const savedQuotes = ALL_QUOTES.filter(q => favIds.includes(q.id));

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1565C0" />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {savedQuotes.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>💔</Text>
            <Text style={s.emptyTitle}>No saved quotes yet</Text>
            <Text style={s.emptySub}>
              Go to the Home tab and tap the ❤️ on any quote to save it here.
            </Text>
          </View>
        ) : (
          <>
            <Text style={s.countLine}>
              {savedQuotes.length} quote{savedQuotes.length !== 1 ? 's' : ''} saved
            </Text>
            {savedQuotes.map(q => (
              <View key={q.id} style={[s.card, { borderLeftColor: q.color }]}>
                <View style={s.cardTop}>
                  <Text style={s.cardIcon}>{q.icon}</Text>
                  <TouchableOpacity onPress={() => removeFavorite(q.id)} style={s.removeBtn}>
                    <Ionicons name="heart-dislike-outline" size={20} color="#BDBDBD" />
                  </TouchableOpacity>
                </View>
                <Text style={[s.cardText, { color: q.color }]}>{q.text}</Text>
                <View style={s.savedBadge}>
                  <Ionicons name="heart" size={10} color="#E53935" />
                  <Text style={s.savedBadgeText}>Saved</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  scroll: { padding: 16, paddingBottom: 40 },
  countLine: {
    fontSize: 12, fontWeight: '700', color: '#9E9E9E',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18,
    borderLeftWidth: 4, marginBottom: 12,
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardIcon: { fontSize: 28 },
  removeBtn: { padding: 4 },
  cardText: { fontSize: 15, fontWeight: '600', lineHeight: 23 },
  savedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  savedBadgeText: { fontSize: 11, color: '#E53935', fontWeight: '600' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#424242', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#9E9E9E', textAlign: 'center', lineHeight: 20, paddingHorizontal: 24 },
});
