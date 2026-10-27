import { createPortal } from 'react-dom'
import { usePublicLoading } from './PublicLoadingContext'

export function PublicGlobalLoader() {
  const { isLoading, isActionActive, isFetching, statusText } =
    usePublicLoading()

  if (typeof document === 'undefined' || !isLoading) return null

  const getActionTitle = () => {
    const text = (statusText || '').toLowerCase()
    if (text.includes('review') || text.includes('ulasan')) {
      return 'Mengirim Review'
    }
    if (text.includes('pesan') || text.includes('order')) {
      return 'Memproses Pesanan'
    }
    if (text.includes('kirim') || text.includes('submit')) {
      return 'Mengirim Data'
    }
    return 'Sedang Memproses'
  }

  const title = getActionTitle()

  return createPortal(
    <>
      {/* 1. Slim Top Bar Shimmer Loader (shows on page navigation and background fetching) */}
      {isFetching && (
        <div
          className='public-top-loader'
          role='progressbar'
          aria-label='Indikator memuat halaman'
        >
          <div className='public-top-loader-bar' />
        </div>
      )}

      {/* 2. Fullscreen Action Modal / Blocker (when sending data/review/actions) */}
      {isActionActive && (
        <div
          className='public-action-overlay'
          role='dialog'
          aria-modal='true'
          aria-label={title}
        >
          <div className='public-action-card'>
            <div className='public-spinner public-spinner-lg' />
            <h3>{title}</h3>
            <p>
              {statusText || 'Mohon tunggu sebentar, data sedang diproses...'}
            </p>
            <div className='public-pulse-bar' />
          </div>
        </div>
      )}
    </>,
    document.body,
  )
}
