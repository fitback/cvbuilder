const TOKEN_KEY = "auth_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((v, k) => headers[k] = v);
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([k, v]) => headers[k] = v);
    } else {
      Object.assign(headers, options.headers);
    }
  }
  if (token) headers["Authorization"] = `Bearer ${token}`;

  return fetch(url, { ...options, headers });
}
