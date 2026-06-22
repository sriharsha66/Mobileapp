import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

const USERS_KEY = '@medvault_users';
const SESSION_KEY = '@medvault_session';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, phone: string, phoneVerified?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const sessionJson = await AsyncStorage.getItem(SESSION_KEY);
      if (sessionJson) {
        setUser(JSON.parse(sessionJson));
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const usersJson = await AsyncStorage.getItem(USERS_KEY);
    const users: Array<User & { password: string }> = usersJson ? JSON.parse(usersJson) : [];

    const found = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!found) throw new Error('Invalid email or password.');

    const { password: _, ...userRecord } = found;
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(userRecord));
    setUser(userRecord);
  }

  async function signup(name: string, email: string, password: string, phone: string, phoneVerified = false) {
    const usersJson = await AsyncStorage.getItem(USERS_KEY);
    const users: Array<User & { password: string }> = usersJson ? JSON.parse(usersJson) : [];

    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('An account with this email already exists.');
    }

    const newUser: User & { password: string } = {
      id: Date.now().toString(),
      name,
      email,
      phone,
      phoneVerified,
      password,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));

    const { password: _, ...userRecord } = newUser;
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(userRecord));
    setUser(userRecord);
  }

  async function logout() {
    await AsyncStorage.removeItem(SESSION_KEY);
    setUser(null);
  }

  async function updateProfile(data: Partial<User>) {
    if (!user) return;
    const updated = { ...user, ...data };

    const usersJson = await AsyncStorage.getItem(USERS_KEY);
    const users: Array<User & { password: string }> = usersJson ? JSON.parse(usersJson) : [];
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...data };
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    setUser(updated);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
