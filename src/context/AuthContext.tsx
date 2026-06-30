import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { api, saveToken, clearToken, getToken } from '../services/api';

const SESSION_KEY = '@medvault_session';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  requestPhoneOTP: (phone: string) => Promise<string>;
  loginWithPhoneOTP: (phone: string, entered: string, sent: string) => Promise<void>;
  signup: (name: string, email: string, password: string, phone: string, phoneVerified?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  sendPasswordResetCode: (email: string) => Promise<string>;
  resetPassword: (email: string, entered: string, sent: string, newPassword: string) => Promise<void>;
}

interface ApiUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  date_of_birth?: string;
  blood_group?: string;
  created_at?: string;
}

interface AuthResponse {
  token: string;
  user: ApiUser;
}

interface OtpResponse {
  message: string;
  otp: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

function toUser(u: ApiUser): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email ?? '',
    phone: u.phone ?? '',
    avatar: u.avatar,
    dateOfBirth: u.date_of_birth,
    bloodGroup: u.blood_group,
    createdAt: u.created_at ?? new Date().toISOString(),
    phoneVerified: true,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { restoreSession(); }, []);

  async function restoreSession() {
    try {
      const token = await getToken();
      if (token) {
        const apiUser = await api.get<ApiUser>('/api/auth/me');
        const u = toUser(apiUser);
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(u));
        setUser(u);
      }
    } catch {
      await clearToken();
      await AsyncStorage.removeItem(SESSION_KEY);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const res = await api.post<AuthResponse>('/api/auth/login', { email, password });
    await saveToken(res.token);
    const u = toUser(res.user);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(u));
    setUser(u);
  }

  async function requestPhoneOTP(phone: string): Promise<string> {
    const res = await api.post<OtpResponse>('/api/auth/send-otp', { phone });
    return res.otp; // demo: backend returns the OTP
  }

  async function loginWithPhoneOTP(phone: string, entered: string, _sent: string) {
    const res = await api.post<AuthResponse>('/api/auth/verify-otp', {
      phone,
      otp: entered,
      sent_otp: entered,
    });
    await saveToken(res.token);
    const u = toUser(res.user);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(u));
    setUser(u);
  }

  async function signup(name: string, email: string, password: string, phone: string, _phoneVerified = false) {
    const res = await api.post<AuthResponse>('/api/auth/signup', { name, email, phone, password });
    await saveToken(res.token);
    const u = toUser(res.user);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(u));
    setUser(u);
  }

  async function logout() {
    await clearToken();
    await AsyncStorage.removeItem(SESSION_KEY);
    setUser(null);
  }

  async function updateProfile(data: Partial<User>) {
    if (!user) return;
    const payload: Record<string, string | undefined> = {};
    if (data.name)        payload.name          = data.name;
    if (data.phone)       payload.phone         = data.phone;
    if (data.dateOfBirth) payload.date_of_birth = data.dateOfBirth;
    if (data.bloodGroup)  payload.blood_group   = data.bloodGroup;
    if (data.avatar)      payload.avatar        = data.avatar;

    const updated = await api.put<ApiUser>('/api/auth/profile', payload);
    const u = { ...user, ...toUser(updated) };
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(u));
    setUser(u);
  }

  async function sendPasswordResetCode(email: string): Promise<string> {
    const res = await api.post<OtpResponse>('/api/auth/forgot-password', { email });
    return res.otp; // demo
  }

  async function resetPassword(email: string, entered: string, _sent: string, newPassword: string) {
    await api.post('/api/auth/reset-password', { email, otp: entered, new_password: newPassword });
  }

  return (
    <AuthContext.Provider value={{
      user, isLoading, login, requestPhoneOTP, loginWithPhoneOTP,
      signup, logout, updateProfile, sendPasswordResetCode, resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
