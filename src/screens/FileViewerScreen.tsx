import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Alert } from 'react-native';
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

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.icon}>{fileType === 'pdf' ? '📄' : '🩻'}</Text>
        <Text style={styles.title}>{fileName}</Text>
        <Text style={styles.type}>{fileType.toUpperCase()} File</Text>
        <Text style={styles.info}>
          {fileType === 'pdf'
            ? 'This file is saved locally on your device. To view it, open your device\'s file manager or use a PDF reader app.'
            : 'DICOM files require a specialized DICOM viewer app. This file is stored locally and can be opened with a compatible app.'}
        </Text>
        <Text style={styles.path} selectable>{fileUri}</Text>
      </View>
    </View>
  );
}

const makeStyles = (t: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: t.surface, borderRadius: 16, padding: 28, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, width: '100%' },
  icon: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 16, fontWeight: '700', color: t.text, textAlign: 'center', marginBottom: 6 },
  type: { fontSize: 12, fontWeight: '700', color: '#1565C0', backgroundColor: t.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 16 },
  info: { fontSize: 14, color: t.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 16 },
  path: { fontSize: 11, color: t.textMuted, textAlign: 'center', lineHeight: 16 },
});
