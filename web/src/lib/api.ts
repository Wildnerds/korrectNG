import Cookies from 'js-cookie';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

// Methods that require CSRF token
const CSRF_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

interface FetchOptions extends RequestInit {
  token?: string;
}

/**
 * Get CSRF token from cookie, fetching a new one if needed
 */
async function getCsrfToken(): Promise<string | undefined> {
  let token = Cookies.get(CSRF_COOKIE_NAME);

  if (!token) {
    // Fetch a new CSRF token from the server
    try {
      const res = await fetch(`${API_BASE}/csrf-token`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        token = data.data?.csrfToken;
      }
    } catch {
      // Ignore errors - token will be set by the next request
    }
  }

  return token;
}

export class ApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
  }
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<{ success: boolean; data?: T; error?: string; message?: string; code?: string }> {
  const { token, ...fetchOptions } = options;
  const method = (fetchOptions.method || 'GET').toUpperCase();

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (!(fetchOptions.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Add CSRF token for state-changing requests
  if (CSRF_METHODS.includes(method)) {
    const csrfToken = await getCsrfToken();
    if (csrfToken) {
      headers[CSRF_HEADER_NAME] = csrfToken;
    }
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
    credentials: 'include',
  });

  const data = await res.json();

  if (!res.ok) {
    const error = new ApiError(data.error || 'Something went wrong', data.code);
    throw error;
  }

  return data;
}

// Server-side fetch that forwards cookies
export async function serverFetch<T = any>(
  endpoint: string,
  cookieHeader?: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers,
    cache: 'no-store',
  });

  return res.json();
}
