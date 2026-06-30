import { Platform } from 'react-native';
import { MedFile, MedReport } from '../types';
import { api, API_BASE, getToken } from './api';

// ── Types mirroring backend response ─────────────────────────────
interface ApiFile {
  id: string;
  report_id: string;
  file_name: string;
  file_type: string;
  mime_type?: string;
  file_size?: number;
  uri: string;
}

interface ApiReport {
  id: string;
  user_id: string;
  title: string;
  report_type: string;
  date: string;
  hospital_name?: string;
  hospital_address?: string;
  doctor_name?: string;
  patient_id?: string;
  notes?: string;
  next_visit_date?: string;
  created_at?: string;
  updated_at?: string;
  files: ApiFile[];
}

function toMedFile(f: ApiFile): MedFile {
  const uri = f.uri.replace(/^https?:\/\/[^/]+/, API_BASE);
  return {
    id: f.id,
    name: f.file_name,
    uri,
    type: f.file_type as MedFile['type'],
    mimeType: f.mime_type ?? 'application/octet-stream',
    size: f.file_size ?? 0,
    createdAt: new Date().toISOString(),
  };
}

function toMedReport(r: ApiReport): MedReport {
  return {
    id: r.id,
    title: r.title,
    reportType: r.report_type as MedReport['reportType'],
    date: r.date,
    hospitalName: r.hospital_name ?? '',
    hospitalAddress: r.hospital_address ?? '',
    doctorName: r.doctor_name ?? '',
    patientId: r.patient_id ?? '',
    notes: r.notes ?? '',
    nextVisitDate: r.next_visit_date,
    files: r.files.map(toMedFile),
    createdAt: r.created_at ?? new Date().toISOString(),
    updatedAt: r.updated_at ?? new Date().toISOString(),
  };
}

// ── Public API ────────────────────────────────────────────────────

export async function getReports(_userId: string): Promise<MedReport[]> {
  const list = await api.get<ApiReport[]>('/api/reports');
  return list.map(toMedReport);
}

export async function saveReport(_userId: string, report: MedReport): Promise<void> {
  const payload = {
    title: report.title,
    report_type: report.reportType,
    date: report.date,
    hospital_name: report.hospitalName || undefined,
    hospital_address: report.hospitalAddress || undefined,
    doctor_name: report.doctorName || undefined,
    patient_id: report.patientId || undefined,
    notes: report.notes || undefined,
    next_visit_date: report.nextVisitDate || undefined,
    file_ids: report.files.map((f) => f.id),
  };

  // Check if report exists by trying to find it in the list
  const existing = await api.get<ApiReport[]>('/api/reports');
  const exists = existing.some((r) => r.id === report.id);

  if (exists) {
    await api.put(`/api/reports/${report.id}`, payload);
  } else {
    await api.post('/api/reports', payload);
  }
}

export async function deleteReport(_userId: string, reportId: string): Promise<void> {
  await api.delete(`/api/reports/${reportId}`);
}

// Upload a file to the server and return a MedFile with server URI
export async function copyFileToStorage(
  _userId: string,
  sourceUri: string,
  fileName: string,
  mimeType = 'application/octet-stream',
): Promise<string> {
  const token = await getToken();

  const form = new FormData();
  if (Platform.OS === 'web' && (sourceUri.startsWith('blob:') || sourceUri.startsWith('data:'))) {
    // Browsers don't accept the { uri, name, type } shorthand — fetch the actual blob
    const res = await fetch(sourceUri);
    const blob = await res.blob();
    const file = new File([blob], fileName, { type: blob.type || mimeType });
    form.append('file', file);
  } else {
    form.append('file', { uri: sourceUri, name: fileName, type: mimeType } as any);
  }

  const response = await fetch(`${API_BASE}/api/files/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
    throw new Error(err.detail || `Upload failed (${response.status})`);
  }

  const uploaded: ApiFile = await response.json();
  return uploaded.uri.replace(/^https?:\/\/[^/]+/, API_BASE);
}

// Extract file ID from a server URI for attaching to reports
export function fileIdFromUri(uri: string): string {
  return uri.split('/').pop() ?? uri;
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
