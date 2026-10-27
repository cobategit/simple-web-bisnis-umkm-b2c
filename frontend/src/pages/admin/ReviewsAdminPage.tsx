import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, type ApiResult } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import type { Review } from '../../types'

export function ReviewsAdminPage() {
  const { accessToken, can } = useAuth()
  const qc = useQueryClient()
  const [error, setError] = useState('')
  const q = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: () =>
      apiFetch<ApiResult<Review[]>>('/admin/reviews', {}, accessToken),
    enabled: !!accessToken,
  })
  const update = useMutation({
    mutationFn: (r: Review) =>
      apiFetch(
        `/admin/reviews/${r.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            is_approved: r.is_approved,
            is_featured: r.is_featured,
          }),
        },
        accessToken,
      ),
    meta: { action: 'Memperbarui status review...' },
    onSuccess: () => {
      setError('')
      void qc.invalidateQueries({ queryKey: ['admin-reviews'] })
    },
    onError: (e) => setError(e.message),
  })
  const del = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/reviews/${id}`, { method: 'DELETE' }, accessToken),
    meta: { action: 'Menghapus review...' },
    onSuccess: () => {
      setError('')
      void qc.invalidateQueries({ queryKey: ['admin-reviews'] })
    },
    onError: (e) => setError(e.message),
  })
  return (
    <div className='admin-page'>
      <div className='admin-title'>
        <div>
          <span className='eyebrow'>CMS</span>
          <h1>Review</h1>
          <p>Moderasi review pelanggan sebelum tampil di website.</p>
        </div>
      </div>
      {error && (
        <div
          style={{
            padding: '12px 16px',
            background: '#fef2f2',
            color: '#991b1b',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            marginBottom: '16px',
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}
      <div className='review-admin-grid'>
        {q.data?.data.map((r) => (
          <div className='panel' key={r.id}>
            <div className='stars'>{'★'.repeat(r.rating)}</div>
            <h3>{r.customer_name}</h3>
            <p>{r.message}</p>
            <div className='review-controls'>
              <label className='check'>
                <input
                  disabled={!can('reviews.write') || update.isPending}
                  type='checkbox'
                  checked={!!r.is_approved}
                  onChange={(e) =>
                    update.mutate({ ...r, is_approved: e.target.checked })
                  }
                />{' '}
                Approved
              </label>
              <label className='check'>
                <input
                  disabled={!can('reviews.write') || update.isPending}
                  type='checkbox'
                  checked={r.is_featured}
                  onChange={(e) =>
                    update.mutate({ ...r, is_featured: e.target.checked })
                  }
                />{' '}
                Featured
              </label>
              {can('reviews.write') && (
                <button
                  className='danger-link'
                  disabled={del.isPending}
                  onClick={() => confirm('Hapus review?') && del.mutate(r.id)}
                >
                  {del.isPending ? 'Menghapus...' : 'Hapus'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
