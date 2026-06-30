import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Alert, ActivityIndicator, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as LegacyFS from 'expo-file-system/legacy';
import { useTheme, AppTheme } from '../context/ThemeContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { MainStackParamList } from '../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'FileViewer'>;
  route: RouteProp<MainStackParamList, 'FileViewer'>;
};

export default function FileViewerScreen({ navigation, route }: Props) {
  const { fileUri, fileType, fileName } = route.params;
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [loading, setLoading] = useState(false);

  async function openFile() {
    setLoading(true);
    try {
      let localUri = fileUri;

      if (fileUri.startsWith('http')) {
        const ext = fileName.includes('.') ? '.' + fileName.split('.').pop() : '';
        const tempPath = (LegacyFS.cacheDirectory ?? '') + `mv_view_${Date.now()}${ext}`;
        await LegacyFS.downloadAsync(fileUri, tempPath);
        localUri = tempPath;
      }

      if (Platform.OS === 'ios') {
        await Share.share({ url: localUri, title: fileName });
      } else {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(localUri, { dialogTitle: `Open ${fileName}` });
        } else {
          Alert.alert('Not available', 'File sharing is not available on this device.');
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not open file. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const icon = fileType === 'pdf' ? '📄' : fileType === 'dicom' ? '🩻' : '📎';
  const hint = fileType === 'pdf'
    ? 'Opens in your PDF reader — you can also print, save, or share from there'
    : 'Opens with a compatible DICOM viewer app installed on your device';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title} numberOfLines={3}>{fileName}</Text>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{fileType.toUpperCase()}</Text>
        </View>

        <TouchableOpacity
          style={[styles.openBtn, loading && styles.openBtnDisabled]}
          onPress={openFile}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="open-outline" size={20} color="#fff" />
              <Text style={styles.openBtnText}>Open / Share</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.hint}>{hint}</Text>
      </View>
    </View>
  );
}

const makeStyles = (t: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: t.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  icon: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 16, fontWeight: '700', color: t.text, textAlign: 'center', marginBottom: 12, lineHeight: 22 },
  typeBadge: {
    backgroundColor: t.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 24,
  },
  typeText: { fontSize: 12, fontWeight: '700', color: '#1565C0', letterSpacing: 1 },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1565C0',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  openBtnDisabled: { opacity: 0.7 },
  openBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 13, color: t.textMuted, textAlign: 'center', lineHeight: 19, marginTop: 20 },
});
