import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Directory, File, Paths } from 'expo-file-system';
import { MedFile, MedReport } from '../types';

const reportsKey = (userId: string) => `@medvault_reports_${userId}`;

function ensureDir(userId: string): Directory {
  const dir = new Directory(Paths.document, 'medvault', userId);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

export async function getReports(userId: string): Promise<MedReport[]> {
  const json = await AsyncStorage.getItem(reportsKey(userId));
  return json ? JSON.parse(json) : [];
}

export async function saveReport(userId: string, report: MedReport): Promise<void> {
  const reports = await getReports(userId);
  const idx = reports.findIndex((r) => r.id === report.id);
  if (idx !== -1) {
    reports[idx] = report;
  } else {
    reports.unshift(report);
  }
  await AsyncStorage.setItem(reportsKey(userId), JSON.stringify(reports));
}

export async function deleteReport(userId: string, reportId: string): Promise<void> {
  const reports = await getReports(userId);
  const report = reports.find((r) => r.id === reportId);
  if (report) {
    for (const f of report.files) {
      try {
        const file = new File(f.uri);
        if (file.exists) file.delete();
      } catch {
        // ignore
      }
    }
  }
  const updated = reports.filter((r) => r.id !== reportId);
  await AsyncStorage.setItem(reportsKey(userId), JSON.stringify(updated));
}

// Async copy using legacy FileSystem.copyAsync for reliable content:// URI support on Android
export async function copyFileToStorage(
  userId: string,
  sourceUri: string,
  fileName: string
): Promise<string> {
  const dir = ensureDir(userId);
  const safeFileName =
    Date.now().toString(36) + '_' + fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const destFile = new File(dir, safeFileName);
  await FileSystem.copyAsync({ from: sourceUri, to: destFile.uri });
  return destFile.uri;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function buildReportTitle(
  reportType: string,
  hospitalName: string,
  date: string
): string {
  const type = reportType
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
  const hospital = hospitalName.replace(/\s+/g, '').slice(0, 15);
  return `${date}_${type}_${hospital || 'Unknown'}`;
}
