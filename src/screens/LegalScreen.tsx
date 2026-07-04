import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { MainStackParamList } from '../navigation/types';
import { useTheme, AppTheme } from '../context/ThemeContext';
import { TERMS, PRIVACY, LegalDoc, LegalBlock } from '../constants/legal';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'Legal'>;
  route: RouteProp<MainStackParamList, 'Legal'>;
};

export default function LegalScreen({ route }: Props) {
  const { type } = route.params;
  const { theme: t } = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const doc: LegalDoc = type === 'terms' ? TERMS : PRIVACY;

  return (
    <View style={s.container}>
      {/* Document header */}
      <View style={s.docHeader}>
        <View style={s.docIconWrap}>
          <Ionicons
            name={type === 'terms' ? 'document-text' : 'shield-checkmark'}
            size={32}
            color="#fff"
          />
        </View>
        <Text style={s.docTitle}>{doc.title}</Text>
        <Text style={s.docSubtitle}>{doc.subtitle}</Text>
        <Text style={s.docDate}>Last updated: {doc.lastUpdated}</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {doc.blocks.map((block, i) => (
          <LegalBlockView key={i} block={block} s={s} />
        ))}
        <View style={s.bottomNote}>
          <Ionicons name="checkmark-circle" size={16} color="#43A047" style={{ marginRight: 6 }} />
          <Text style={s.bottomNoteText}>
            This document is compliant with Indian laws including DPDPA 2023, IT Act 2000, and Consumer Protection Act 2019.
          </Text>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function LegalBlockView({ block, s }: { block: LegalBlock; s: ReturnType<typeof makeStyles> }) {
  switch (block.kind) {
    case 'heading':
      return <Text style={s.heading}>{block.text}</Text>;
    case 'subhead':
      return <Text style={s.subhead}>{block.text}</Text>;
    case 'para':
      return <Text style={s.para}>{block.text}</Text>;
    case 'bullet':
      return (
        <View style={s.bulletRow}>
          <Text style={s.bulletDot}>•</Text>
          <Text style={s.bulletText}>{block.text}</Text>
        </View>
      );
    case 'warning':
      return (
        <View style={s.warningBox}>
          <Text style={s.warningText}>{block.text}</Text>
        </View>
      );
    case 'divider':
      return <View style={s.divider} />;
    default:
      return null;
  }
}

const makeStyles = (t: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },

  docHeader: {
    backgroundColor: '#1565C0',
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  docIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  docTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.4,
  },
  docSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
    textAlign: 'center',
  },
  docDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 6,
    fontStyle: 'italic',
  },

  scroll: { flex: 1 },
  scrollContent: { padding: 20 },

  heading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1565C0',
    marginTop: 4,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  subhead: {
    fontSize: 13,
    fontWeight: '700',
    color: t.text,
    marginTop: 10,
    marginBottom: 4,
  },
  para: {
    fontSize: 13,
    color: t.text,
    lineHeight: 21,
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 5,
    paddingLeft: 4,
  },
  bulletDot: {
    fontSize: 14,
    color: '#1565C0',
    marginRight: 8,
    lineHeight: 21,
    fontWeight: '700',
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: t.text,
    lineHeight: 21,
  },
  warningBox: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FB8C00',
    borderRadius: 8,
    padding: 14,
    marginVertical: 10,
  },
  warningText: {
    fontSize: 13,
    color: '#E65100',
    lineHeight: 20,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: t.divider,
    marginVertical: 16,
  },
  bottomNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 14,
    marginTop: 20,
  },
  bottomNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#2E7D32',
    lineHeight: 18,
  },
});
