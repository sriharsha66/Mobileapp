import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { BiometricProvider } from './src/context/BiometricContext';
import AppNavigator from './src/navigation/AppNavigator';
import WebGlobalStyles from './src/components/WebGlobalStyles';
import { cancelVisitNotifications } from './src/services/notificationService';
import { navigationRef, setPendingReportNav } from './src/navigation/navigationRef';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MedReport } from './src/types';

const REPORTS_PREFIX = '@medvault_reports_';

async function cancelNotificationsForReport(reportId: string) {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const reportKeys = allKeys.filter(k => k.startsWith(REPORTS_PREFIX));
    for (const key of reportKeys) {
      const json = await AsyncStorage.getItem(key);
      if (!json) continue;
      const reports: MedReport[] = JSON.parse(json);
      const report = reports.find(r => r.id === reportId);
      if (report?.visitNotificationIds?.length) {
        await cancelVisitNotifications(report.visitNotificationIds);
        break;
      }
    }
  } catch {}
}

function handleNotificationReportId(reportId: string) {
  cancelNotificationsForReport(reportId);
  if (navigationRef.isReady()) {
    (navigationRef as any).navigate('ReportDetail', { reportId });
  } else {
    // App was killed — store it, AppNavigator picks it up in onReady
    setPendingReportNav(reportId);
  }
}

export default function App() {
  useEffect(() => {
    // Killed-app case: notification that launched the app
    Notifications.getLastNotificationResponseAsync().then(response => {
      const reportId = response?.notification.request.content.data?.reportId as string | undefined;
      if (reportId) setPendingReportNav(reportId);
    });

    // Foreground / background case: user taps notification while app is running
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const reportId = response.notification.request.content.data?.reportId as string | undefined;
      if (reportId) handleNotificationReportId(reportId);
    });

    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <WebGlobalStyles />
      <ThemeProvider>
        <AuthProvider>
          <BiometricProvider>
            <AppNavigator />
          </BiometricProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
