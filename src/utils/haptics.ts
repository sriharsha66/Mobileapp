import * as Haptics from 'expo-haptics';

// Light tap — tab switches, button presses
export function hapticTab() {
  Haptics.selectionAsync().catch(() => {});
}

// Medium impact — theme toggle
export function hapticMedium() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

// Success notification — save, share completed
export function hapticSuccess() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
