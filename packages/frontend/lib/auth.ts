const TOKEN_KEY = "auth_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  // 同时写入 cookie，供 middleware 做服务端路由保护
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  // 清除 cookie
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
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

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
