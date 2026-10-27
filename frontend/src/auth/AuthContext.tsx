import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  apiFetch,
  onSessionExpired,
  onSessionUpdate,
  parseJwtExp,
  refreshSession,
  setAuthToken,
  type AuthResponse,
  type AuthUser,
} from '../api/client'

export type { AuthUser }

type AuthContextValue = {
  user: AuthUser | null
  accessToken: string
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  can: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setAccessToken] = useState('')
  const [loading, setLoading] = useState(true)

  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const wasLoggedInRef = useRef(false)

  useEffect(() => {
    if (user) {
      wasLoggedInRef.current = true
    }
  }, [user])

  const handleSessionExpired = useCallback(
    (reason?: 'expired' | 'missing') => {
      const hadSession = wasLoggedInRef.current
      wasLoggedInRef.current = false
      setUser(null)
      setAccessToken('')
      setAuthToken(null)
      queryClient.clear()

      const shouldShowExpiredAlert = hadSession || reason === 'expired'
      if (
        location.pathname.startsWith('/cms') &&
        location.pathname !== '/cms/login'
      ) {
        navigate('/cms/login', {
          replace: true,
          state: { sessionExpired: shouldShowExpiredAlert },
        })
      }
    },
    [location.pathname, navigate, queryClient],
  )

  // Listen to background / cross-tab session updates and expirations
  useEffect(() => {
    const unsubUpdate = onSessionUpdate((session) => {
      setUser(session.user)
      setAccessToken(session.access_token)
      setAuthToken(session.access_token)
      wasLoggedInRef.current = true
    })

    const unsubExpired = onSessionExpired((reason) => {
      handleSessionExpired(reason)
    })

    return () => {
      unsubUpdate()
      unsubExpired()
    }
  }, [handleSessionExpired])

  // Initial session check on mount
  useEffect(() => {
    async function initSession() {
      try {
        const token = await refreshSession()
        if (!token) {
          setUser(null)
          setAccessToken('')
        }
      } catch {
        setUser(null)
        setAccessToken('')
      } finally {
        setLoading(false)
      }
    }
    void initSession()
  }, [])

  // Proactive silent refresh timer (refreshes ~60s before access token expires)
  useEffect(() => {
    if (!accessToken) return

    const exp = parseJwtExp(accessToken)
    if (!exp) return

    const msRemaining = exp * 1000 - Date.now()
    const refreshDelay = Math.max(5000, msRemaining - 60_000)

    const timerId = window.setTimeout(async () => {
      try {
        await refreshSession()
      } catch {
        handleSessionExpired('expired')
      }
    }, refreshDelay)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const remaining = exp * 1000 - Date.now()
        if (remaining <= 60_000) {
          void refreshSession()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearTimeout(timerId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [accessToken, handleSessionExpired])

  async function login(email: string, password: string) {
    const res = await apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setAuthToken(res.access_token)
    setUser(res.user)
    setAccessToken(res.access_token)
    wasLoggedInRef.current = true
  }

  async function logout() {
    try {
      await apiFetch('/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    wasLoggedInRef.current = false
    setAuthToken(null)
    setUser(null)
    setAccessToken('')
    queryClient.clear()
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      loading,
      login,
      logout,
      can: (permission) =>
        Boolean(
          user?.permissions.includes(permission) ||
          user?.permissions.includes('*'),
        ),
    }),
    [user, accessToken, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
