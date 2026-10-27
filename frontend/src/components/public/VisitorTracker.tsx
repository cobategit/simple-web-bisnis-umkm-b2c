import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { API_URL } from '../../api/client'

export function VisitorTracker() {
  const location = useLocation()
  const lastRecordedRef = useRef<string>('')

  useEffect(() => {
    const fullPath = location.pathname + location.search

    // Jangan rekam kunjungan pada area CMS/admin
    if (location.pathname.startsWith('/cms')) {
      return
    }

    // Hindari duplikasi pencatatan jika path sama (misal re-render)
    if (lastRecordedRef.current === fullPath) {
      return
    }
    lastRecordedRef.current = fullPath

    try {
      fetch(`${API_URL}/public/visit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: fullPath,
          referrer: typeof document !== 'undefined' ? document.referrer || '' : '',
        }),
        keepalive: true,
      }).catch(() => {
        // Abaikan error jaringan saat offline/gangguan agar tidak mengganggu browsing user
      })
    } catch {
      // Silently ignore
    }
  }, [location.pathname, location.search])

  return null
}

