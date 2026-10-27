export const API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:8080/api/v1'
export const ASSET_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ASSET_URL) ?? 'http://localhost:8080'

export type ApiResult<T> = { data: T }

export type AuthUser = {
  id: string
  name: string
  email: string
  roles: string[]
  permissions: string[]
}

export type AuthResponse = {
  access_token: string
  user: AuthUser
}

let currentAccessToken: string | null = null

export function getAuthToken(): string | null {
  return currentAccessToken
}

export function setAuthToken(token: string | null) {
  currentAccessToken = token
}

export function parseJwtExp(token: string): number | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const json = atob(padded)
    const payload = JSON.parse(json)
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}

type SessionUpdateListener = (session: AuthResponse) => void
type SessionExpiredListener = (reason: 'expired' | 'missing') => void

const sessionUpdateListeners = new Set<SessionUpdateListener>()
const sessionExpiredListeners = new Set<SessionExpiredListener>()

const authChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('printku_auth') : null

if (authChannel) {
  authChannel.onmessage = (event) => {
    if (event.data?.type === 'SESSION_UPDATE' && event.data.session) {
      currentAccessToken = event.data.session.access_token
      for (const listener of sessionUpdateListeners) {
        try {
          listener(event.data.session)
        } catch (e) {
          console.error('Error in session update listener', e)
        }
      }
    } else if (event.data?.type === 'SESSION_EXPIRED') {
      currentAccessToken = null
      const reason = event.data?.reason || 'expired'
      for (const listener of sessionExpiredListeners) {
        try {
          listener(reason)
        } catch (e) {
          console.error('Error in session expired listener', e)
        }
      }
    }
  }
}

export function onSessionUpdate(listener: SessionUpdateListener): () => void {
  sessionUpdateListeners.add(listener)
  return () => {
    sessionUpdateListeners.delete(listener)
  }
}

export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener)
  return () => {
    sessionExpiredListeners.delete(listener)
  }
}

function notifySessionUpdate(session: AuthResponse, broadcast = true) {
  for (const listener of sessionUpdateListeners) {
    try {
      listener(session)
    } catch (e) {
      console.error('Error in session update listener', e)
    }
  }
  if (broadcast && authChannel) {
    try {
      authChannel.postMessage({ type: 'SESSION_UPDATE', session })
    } catch {
      // ignore
    }
  }
}

export function notifySessionExpired(reason: 'expired' | 'missing' = 'expired', broadcast = true) {
  setAuthToken(null)
  for (const listener of sessionExpiredListeners) {
    try {
      listener(reason)
    } catch (e) {
      console.error('Error in session expired listener', e)
    }
  }
  if (broadcast && authChannel) {
    try {
      authChannel.postMessage({ type: 'SESSION_EXPIRED', reason })
    } catch {
      // ignore
    }
  }
}

let refreshPromise: Promise<string | null> | null = null

export async function refreshSession(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null
        const reason = body?.message === 'sesi sudah berakhir' ? 'expired' : 'missing'
        notifySessionExpired(reason)
        return null
      }

      const data = (await response.json()) as AuthResponse
      setAuthToken(data.access_token)
      notifySessionUpdate(data)
      return data.access_token
    } catch {
      notifySessionExpired('expired')
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const token = currentAccessToken || accessToken || undefined

  const headers = new Headers(options.headers)
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  // Intercept 401 Unauthorized
  if (response.status === 401) {
    // If this is an auth endpoint itself (login, refresh, logout):
    if (path.startsWith('/auth/')) {
      const body = await response.json().catch(() => ({ message: response.statusText }))
      if (path === '/auth/refresh') {
        const reason = body.message === 'sesi sudah berakhir' ? 'expired' : 'missing'
        notifySessionExpired(reason)
      }
      throw new Error(body.message || 'Request failed')
    }

    // Authenticated request failed with 401: attempt to refresh session
    const newToken = await refreshSession()
    if (newToken) {
      // Retry request with fresh access token
      const retryHeaders = new Headers(options.headers)
      if (!(options.body instanceof FormData)) retryHeaders.set('Content-Type', 'application/json')
      retryHeaders.set('Authorization', `Bearer ${newToken}`)

      const retryResponse = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: retryHeaders,
        credentials: 'include',
      })

      if (!retryResponse.ok) {
        const body = await retryResponse.json().catch(() => ({ message: retryResponse.statusText }))
        throw new Error(body.message || 'Request failed')
      }
      if (retryResponse.status === 204) return undefined as T
      return retryResponse.json() as Promise<T>
    }

    // Refresh failed (refresh token expired/exhausted)
    throw new Error('Sesi Anda telah berakhir. Silakan login kembali.')
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(body.message || 'Request failed')
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function assetUrl(value?: string) {
  if (!value) return ''
  if (/^https?:\/\//.test(value)) return value
  return `${ASSET_URL}${value}`
}
