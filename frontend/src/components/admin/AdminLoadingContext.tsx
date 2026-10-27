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
import {
  useIsFetching,
  useIsMutating,
  useQueryClient,
} from '@tanstack/react-query'

export type AdminLoadingContextValue = {
  isLoading: boolean
  isFetching: boolean
  isMutating: boolean
  isActionActive: boolean
  statusText: string
  startAction: (message?: string) => string
  stopAction: (id: string) => void
  withAction: <T>(
    promiseOrFn: Promise<T> | (() => Promise<T>),
    message?: string,
  ) => Promise<T>
}

const AdminLoadingContext = createContext<AdminLoadingContextValue | null>(null)

let nextActionId = 1
const MIN_ACTION_DURATION = 650 // Minimum duration in ms to ensure loading is perceptible and non-flickering

export function AdminLoadingProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const isFetchingCount = useIsFetching()
  const isMutatingCount = useIsMutating()

  // Track active mutations directly from MutationCache with start times
  const [activeMutations, setActiveMutations] = useState<
    Map<number, { message: string; startTime: number }>
  >(new Map())

  // Manual actions registry (e.g. file uploads, logout, custom async workflows)
  const [activeManualActions, setActiveManualActions] = useState<
    Map<string, { message: string; startTime: number }>
  >(new Map())

  // Timers to ensure minimum display duration
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
      const message = meta?.action || 'Menyimpan data...'

      if (actionType === 'pending') {
        // Cancel any pending timer for this mutation
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
    const id = `action_${nextActionId++}`
    setActiveManualActions((prev) => {
      const next = new Map(prev)
      next.set(id, {
        message: message || 'Sedang memproses aksi...',
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

  const isFetching = isFetchingCount > 0
  const isMutating = activeMutations.size > 0 || isMutatingCount > 0
  const isActionActive = isMutating || activeManualActions.size > 0
  const isLoading = isFetching || isActionActive

  // Determine friendly, informative status message
  const statusText = useMemo(() => {
    // 1. Manual actions (uploads, logout, etc)
    if (activeManualActions.size > 0) {
      const records = Array.from(activeManualActions.values())
      return records[records.length - 1].message
    }
    // 2. Active mutations (products, articles, content, settings, reviews, users)
    if (activeMutations.size > 0) {
      const records = Array.from(activeMutations.values())
      return records[records.length - 1].message
    }
    // 3. Fallback for generic mutating
    if (isMutating) {
      return 'Menyimpan perubahan data...'
    }
    // 4. Fallback for fetching
    if (isFetching) {
      return 'Memuat data CMS...'
    }
    return ''
  }, [activeManualActions, activeMutations, isMutating, isFetching])

  const value = useMemo<AdminLoadingContextValue>(
    () => ({
      isLoading,
      isFetching,
      isMutating,
      isActionActive,
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
      statusText,
      startAction,
      stopAction,
      withAction,
    ],
  )

  return (
    <AdminLoadingContext.Provider value={value}>
      {children}
    </AdminLoadingContext.Provider>
  )
}

export function useAdminLoading() {
  const context = useContext(AdminLoadingContext)
  if (!context) {
    throw new Error(
      'useAdminLoading must be used within an AdminLoadingProvider',
    )
  }
  return context
}
