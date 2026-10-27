import { createPortal } from 'react-dom'
import { useAdminLoading } from './AdminLoadingContext'

export function AdminGlobalLoader() {
  const { isLoading, isActionActive, isFetching, statusText } =
    useAdminLoading()

  if (typeof document === 'undefined' || !isLoading) return null

  const getActionTitle = () => {
    const text = (statusText || '').toLowerCase()
    if (text.includes('unggah') || text.includes('upload')) {
      return 'Mengunggah Berkas'
    }
    if (text.includes('hapus') || text.includes('delete')) {
      return 'Menghapus Data'
    }
    if (text.includes('keluar') || text.includes('logout')) {
      return 'Keluar Akun'
    }
    if (
      text.includes('simpan') ||
      text.includes('tambah') ||
      text.includes('buat') ||
      text.includes('perbarui') ||
      text.includes('update')
    ) {
      return 'Menyimpan Data'
    }
    return 'Sedang Memproses'
  }

  const title = getActionTitle()

  return createPortal(
    <>
      {/* 1. Slim Top Bar Loader */}
      <div
        className='admin-top-loader'
        role='progressbar'
        aria-label='Loading indicator'
      >
        <div className='admin-top-loader-bar' />
      </div>

      {/* 2. Floating Status Badge (for general data fetching or background activity) */}
      {!isActionActive && isFetching && (
        <div className='admin-floating-badge' aria-live='polite'>
          <span className='admin-spinner admin-spinner-sm' />
          <span>{statusText || 'Memuat data...'}</span>
        </div>
      )}

      {/* 3. Action Overlay / Blocker (when mutating / saving / deleting / uploading) */}
      {isActionActive && (
        <div
          className='admin-action-overlay'
          role='dialog'
          aria-modal='true'
          aria-label={title}
        >
          <div className='admin-action-card'>
            <div className='admin-spinner admin-spinner-lg' />
            <h3>{title}</h3>
            <p>
              {statusText || 'Mohon tunggu sebentar, data sedang diproses...'}
            </p>
            <div className='admin-pulse-bar' />
          </div>
        </div>
      )}
    </>,
    document.body,
  )
}
