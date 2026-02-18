import * as SecureStore from 'expo-secure-store';

export const API_URL = 'http://localhost:5000/api/v1';
const API_BASE = API_URL;

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync('token');
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync('token', token);
  } catch {
    // Handle error
  }
}

export async function removeToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync('token');
  } catch {
    // Handle error
  }
}

interface FetchOptions extends RequestInit {
  token?: string | null;
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  // Auto-extend session: save refreshed token if provided
  const refreshedToken = res.headers.get('X-Refreshed-Token');
  if (refreshedToken) {
    await setToken(refreshedToken);
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}
