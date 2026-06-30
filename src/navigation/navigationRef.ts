import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

// Module-level pending navigation for killed-app notification taps
let _pendingReportId: string | null = null;

export function setPendingReportNav(reportId: string) {
  _pendingReportId = reportId;
}

export function consumePendingReportNav(): string | null {
  const id = _pendingReportId;
  _pendingReportId = null;
  return id;
}
