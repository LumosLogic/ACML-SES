const TOKEN_KEY = 'acml_token'
const API_KEY_STORAGE = 'acml_api_key'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(API_KEY_STORAGE)
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

export function getStoredApiKey(): string {
  if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_API_KEY || ''
  return localStorage.getItem(API_KEY_STORAGE) || process.env.NEXT_PUBLIC_API_KEY || ''
}

export function setStoredApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE, key)
}

export interface TokenPayload {
  userId: string
  username: string
  role: string
  clientId: string | null
}

export function decodeToken(): TokenPayload | null {
  const token = getToken()
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload)) as TokenPayload
  } catch {
    return null
  }
}
