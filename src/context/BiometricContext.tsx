import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

const STORAGE_KEY = 'medvault_biometric_enabled';

interface BiometricContextType {
  isEnabled: boolean;
  isLocked: boolean;
  isSupported: boolean;
  toggleEnabled: () => Promise<void>;
  authenticate: () => Promise<boolean>;
  unlock: () => void;
}

const BiometricContext = createContext<BiometricContextType>({
  isEnabled: false,
  isLocked: false,
  isSupported: false,
  toggleEnabled: async () => {},
  authenticate: async () => true,
  unlock: () => {},
});

export function BiometricProvider({ children }: { children: React.ReactNode }) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const initialAuthDoneRef = useRef(false);
  // True while authenticateAsync (or its fallback dialog) is open.
  // Prevents the background→active transition caused by the system auth
  // dialog from being mistaken for a genuine app-switch.
  const isAuthenticatingRef = useRef(false);
  // Set to true only on a *genuine* background (not caused by the auth dialog).
  // The app re-locks only when this is true on return to foreground.
  const pendingRelockRef = useRef(false);

  useEffect(() => {
    async function init() {
      const [hasHardware, isEnrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      const supported = hasHardware && isEnrolled;
      setIsSupported(supported);

      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const enabled = stored === 'true' && supported;
      setIsEnabled(enabled);

      if (enabled) {
        setIsLocked(true);
      } else {
        initialAuthDoneRef.current = true;
      }
    }
    init();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;

      if (!isEnabled || !initialAuthDoneRef.current) return;

      // App going to background.
      // Only mark pending relock if it's a genuine user-initiated background
      // (not the system auth dialog stealing focus).
      if (next === 'background' && !isAuthenticatingRef.current) {
        pendingRelockRef.current = true;
      }

      // App returning to foreground — lock only if a genuine background happened.
      if ((prev === 'background' || prev === 'inactive') && next === 'active') {
        if (pendingRelockRef.current) {
          pendingRelockRef.current = false;
          setIsLocked(true);
        }
      }
    });
    return () => sub.remove();
  }, [isEnabled]);

  async function authenticate(): Promise<boolean> {
    isAuthenticatingRef.current = true;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock MedVault',
        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      if (result.success) {
        pendingRelockRef.current = false;
        setIsLocked(false);
        initialAuthDoneRef.current = true;
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      isAuthenticatingRef.current = false;
    }
  }

  async function toggleEnabled() {
    if (!isSupported) return;
    if (isEnabled) {
      await AsyncStorage.setItem(STORAGE_KEY, 'false');
      setIsEnabled(false);
      setIsLocked(false);
      pendingRelockRef.current = false;
    } else {
      isAuthenticatingRef.current = true;
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Confirm to enable biometric lock',
          fallbackLabel: 'Use Passcode',
          cancelLabel: 'Cancel',
          disableDeviceFallback: false,
        });
        if (result.success) {
          await AsyncStorage.setItem(STORAGE_KEY, 'true');
          setIsEnabled(true);
        }
      } finally {
        isAuthenticatingRef.current = false;
      }
    }
  }

  function unlock() {
    pendingRelockRef.current = false;
    setIsLocked(false);
    initialAuthDoneRef.current = true;
  }

  return (
    <BiometricContext.Provider value={{ isEnabled, isLocked, isSupported, toggleEnabled, authenticate, unlock }}>
      {children}
    </BiometricContext.Provider>
  );
}

export function useBiometric() {
  return useContext(BiometricContext);
}
