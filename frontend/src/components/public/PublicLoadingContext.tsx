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
import { useLocation } from 'react-router-dom'
import {
  useIsFetching,
  useIsMutating,
  useQueryClient,
} from '@tanstack/react-query'

export type PublicLoadingContextValue = {
  isLoading: boolean
  isFetching: boolean
  isMutating: boolean
  isActionActive: boolean
  isNavigating: boolean
  statusText: string
  startAction: (message?: string) => string
  stopAction: (id: string) => void
  withAction: <T>(
    promiseOrFn: Promise<T> | (() => Promise<T>),
    message?: string,
  ) => Promise<T>
}

const PublicLoadingContext = createContext<PublicLoadingContextValue | null>(
  null,
)

let nextActionId = 1
const MIN_ACTION_DURATION = 650 // ms to ensure smooth, perceptible loading

export function PublicLoadingProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const location = useLocation()
  const isFetchingCount = useIsFetching()
  const isMutatingCount = useIsMutating()

  // Track route navigation to trigger immediate top progress bar feedback
  const [isNavigating, setIsNavigating] = useState(false)
  const prevPathRef = useRef(location.pathname)

  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname
      setIsNavigating(true)
      const timer = setTimeout(() => {
        setIsNavigating(false)
      }, 450)
      return () => clearTimeout(timer)
    }
  }, [location.pathname])

  // Track active mutations directly from MutationCache with start times
  const [activeMutations, setActiveMutations] = useState<
    Map<number, { message: string; startTime: number }>
  >(new Map())

  // Manual actions registry (custom async workflows)
  const [activeManualActions, setActiveManualActions] = useState<
    Map<string, { message: string; startTime: number }>
  >(new Map())

  // Timers to guarantee minimum display duration
  const pendingTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  )

  useEffect(() => {
    const mutationCache = queryClient.getMutationCache()

    const unsubscribe = mutationCache.subscribe((event) => {
      if (event.type !== 'updated') return

      const mutation = event.mutation
      const mutationId = mutation.mutationId
      const actionType = event.action.type
      const meta = (mutation.options?.meta || mutation.meta) as
        | { action?: string }
        | undefined
      const message = meta?.action || 'Memproses data...'

      if (actionType === 'pending') {
        if (pendingTimersRef.current.has(mutationId)) {
          clearTimeout(pendingTimersRef.current.get(mutationId))
          pendingTimersRef.current.delete(mutationId)
        }

        setActiveMutations((prev) => {
          const next = new Map(prev)
          next.set(mutationId, { message, startTime: Date.now() })
          return next
        })
      } else if (actionType === 'success' || actionType === 'error') {
        setActiveMutations((prev) => {
          const existing = prev.get(mutationId)
          if (!existing) return prev

          const elapsed = Date.now() - existing.startTime
          const remaining = Math.max(0, MIN_ACTION_DURATION - elapsed)

          if (remaining === 0) {
            const next = new Map(prev)
            next.delete(mutationId)
            return next
          }

          const timer = setTimeout(() => {
            setActiveMutations((current) => {
              if (!current.has(mutationId)) return current
              const next = new Map(current)
              next.delete(mutationId)
              return next
            })
            pendingTimersRef.current.delete(mutationId)
          }, remaining)

          pendingTimersRef.current.set(mutationId, timer)
          return prev
        })
      }
    })

    return () => {
      unsubscribe()
      pendingTimersRef.current.forEach((t) => clearTimeout(t))
      pendingTimersRef.current.clear()
    }
  }, [queryClient])

  const startAction = useCallback((message?: string) => {
    const id = `pub_action_${nextActionId++}`
    setActiveManualActions((prev) => {
      const next = new Map(prev)
      next.set(id, {
        message: message || 'Sedang memproses...',
        startTime: Date.now(),
      })
      return next
    })
    return id
  }, [])

  const stopAction = useCallback((id: string) => {
    setActiveManualActions((prev) => {
      if (!prev.has(id)) return prev
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  const withAction = useCallback(
    async <T,>(
      promiseOrFn: Promise<T> | (() => Promise<T>),
      message?: string,
    ): Promise<T> => {
      const actionId = startAction(message)
      const startTime = Date.now()
      try {
        if (typeof promiseOrFn === 'function') {
          return await promiseOrFn()
        }
        return await promiseOrFn
      } finally {
        const elapsed = Date.now() - startTime
        const remaining = Math.max(0, MIN_ACTION_DURATION - elapsed)
        if (remaining > 0) {
          await new Promise((resolve) => setTimeout(resolve, remaining))
        }
        stopAction(actionId)
      }
    },
    [startAction, stopAction],
  )

  const isFetching = isFetchingCount > 0 || isNavigating
  const isMutating = activeMutations.size > 0 || isMutatingCount > 0
  const isActionActive = isMutating || activeManualActions.size > 0
  const isLoading = isFetching || isActionActive

  const statusText = useMemo(() => {
    if (activeManualActions.size > 0) {
      const records = Array.from(activeManualActions.values())
      return records[records.length - 1].message
    }
    if (activeMutations.size > 0) {
      const records = Array.from(activeMutations.values())
      return records[records.length - 1].message
    }
    if (isMutating) {
      return 'Sedang mengirim data...'
    }
    if (isFetching) {
      return 'Memuat konten...'
    }
    return ''
  }, [activeManualActions, activeMutations, isMutating, isFetching])

  const value = useMemo<PublicLoadingContextValue>(
    () => ({
      isLoading,
      isFetching,
      isMutating,
      isActionActive,
      isNavigating,
      statusText,
      startAction,
      stopAction,
      withAction,
    }),
    [
      isLoading,
      isFetching,
      isMutating,
      isActionActive,
      isNavigating,
      statusText,
      startAction,
      stopAction,
      withAction,
    ],
  )

  return (
    <PublicLoadingContext.Provider value={value}>
      {children}
    </PublicLoadingContext.Provider>
  )
}

export function usePublicLoading() {
  const context = useContext(PublicLoadingContext)
  if (!context) {
    throw new Error(
      'usePublicLoading must be used within a PublicLoadingProvider',
    )
  }
  return context
}

/**
 * Hook to coordinate skeleton loading states during initial mount,
 * route navigation, and async query fetching with a smooth minimum perceptible duration.
 */
export function usePublicSkeleton(
  isQueryLoading: boolean,
  minDuration: number = 380,
) {
  const { isNavigating } = usePublicLoading()
  const location = useLocation()
  const [minLoading, setMinLoading] = useState(true)

  useEffect(() => {
    setMinLoading(true)
    const timer = setTimeout(() => {
      setMinLoading(false)
    }, minDuration)
    return () => clearTimeout(timer)
  }, [location.pathname, minDuration])

  return isQueryLoading || isNavigating || minLoading
}

