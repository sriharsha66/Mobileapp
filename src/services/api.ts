import AsyncStorage from '@react-native-async-storage/async-storage';

// ── EXPO GO (expo-app branch) ─────────────────────────────────────
// Production EC2 backend (works on any network):
const DEV_HOST = 'medvaultdemo.duckdns.org';
export const API_BASE = `https://${DEV_HOST}`;

// To test with a LOCAL backend instead, comment out the two lines above
// and uncomment the line below (replace IP with your machine's WiFi IP):
// export const API_BASE = 'http://192.168.1.XXX:8000';

const TOKEN_KEY = '@medvault_jwt';

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function saveToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Core request helper ───────────────────────────────────────────
async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isMultipart = false,
): Promise<T> {
  const headers: Record<string, string> = {
    ...(await authHeaders()),
    ...(!isMultipart ? { 'Content-Type': 'application/json' } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: isMultipart
      ? (body as FormData)
      : body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }

  return res.json() as Promise<T>;
}

export const api = {
  get:    <T>(path: string)              => request<T>('GET', path),
  post:   <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put:    <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string)              => request<T>('DELETE', path),
  upload: <T>(path: string, form: FormData) => request<T>('POST', path, form, true),
};
