export type ReportType =
  | 'blood_test'
  | 'ecg'
  | 'xray'
  | 'mri'
  | 'ct_scan'
  | 'ultrasound'
  | 'prescription'
  | 'discharge_summary'
  | 'vaccination'
  | 'other';

export type FileType = 'image' | 'pdf' | 'video' | 'dicom';

export interface MedFile {
  id: string;
  name: string;
  uri: string;
  type: FileType;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface MedReport {
  id: string;
  title: string;
  date: string;
  hospitalName: string;
  hospitalAddress: string;
  doctorName: string;
  patientId: string;
  reportType: ReportType;
  otherTypeName?: string;
  notes: string;
  files: MedFile[];
  createdAt: string;
  updatedAt: string;
  nextVisitDate?: string;       // ISO datetime string, e.g. "2026-07-10T10:30:00"
  visitNotificationIds?: string[]; // expo-notifications IDs for cancellation
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  phoneVerified?: boolean;
  avatar?: string;
  createdAt: string;
}

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  blood_test: 'Blood Test',
  ecg: 'ECG / Heart',
  xray: 'X-Ray',
  mri: 'MRI',
  ct_scan: 'CT Scan',
  ultrasound: 'Ultrasound',
  prescription: 'Prescription',
  discharge_summary: 'Discharge Summary',
  vaccination: 'Vaccination',
  other: 'Other',
};

export const REPORT_TYPE_ICONS: Record<ReportType, string> = {
  blood_test: 'water',
  ecg: 'heart-pulse',
  xray: 'radiobox-marked',
  mri: 'brain',
  ct_scan: 'camera-iris',
  ultrasound: 'pulse',
  prescription: 'pill',
  discharge_summary: 'file-document',
  vaccination: 'needle',
  other: 'file-outline',
};

export const REPORT_TYPE_COLORS: Record<ReportType, string> = {
  blood_test: '#E53935',
  ecg: '#D81B60',
  xray: '#5E35B1',
  mri: '#3949AB',
  ct_scan: '#00897B',
  ultrasound: '#039BE5',
  prescription: '#43A047',
  discharge_summary: '#FB8C00',
  vaccination: '#8E24AA',
  other: '#757575',
};
