import { useState } from 'react'
import {
  useMutation,
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { apiFetch, type ApiResult } from '../../api/client'
import type { Review } from '../../types'
import { ReviewCardSkeleton } from '../../components/Skeleton'
import { usePublicSkeleton } from '../../components/public/PublicLoadingContext'
import { SEO } from '../../components/SEO'

export function ReviewsPage() {
  const qc = useQueryClient()
  const q = useInfiniteQuery({
    queryKey: ['reviews'],
    queryFn: ({ pageParam = 1 }) =>
      apiFetch<ApiResult<Review[]> & { next_page?: number | null }>(
        `/public/reviews?page=${pageParam}&limit=5`,
      ),
    getNextPageParam: (lastPage) => lastPage.next_page,
    initialPageParam: 1,
  })
  const showSkeleton = usePublicSkeleton(q.isLoading)
  const [form, setForm] = useState({
    customer_name: '',
    rating: 5,
    message: '',
  })
  const m = useMutation({
    mutationFn: () =>
      apiFetch('/public/reviews', {
        method: 'POST',
        body: JSON.stringify(form),
      }),
    meta: { action: 'Mengirim review Anda...' },
    onSuccess: () => {
      setForm({ customer_name: '', rating: 5, message: '' })
      void qc.invalidateQueries({ queryKey: ['reviews'] })
    },
  })

  return (
    <>
      <SEO
        title='Ulasan & Testimoni Pelanggan'
        description='Baca ulasan dan pengalaman nyata pelanggan yang menggunakan layanan cetak cepat, rapi, dan berkualitas dari DR Printing.'
        canonicalPath='/review'
      />
      <section className='section page-top'>
        <div className='container review-page'>
          <div>
            <span className='eyebrow'>REVIEW</span>
            <h1>Apa kata pelanggan?</h1>
            <div className='review-list'>
              {showSkeleton
                ? Array.from({ length: 4 }).map((_, i) => (
                    <ReviewCardSkeleton key={i} />
                  ))
                : q.data?.pages
                    .flatMap((page) => page.data ?? [])
                    .map((r) => (
                      <blockquote key={r.id}>
                        <div className='stars'>{'★'.repeat(r.rating)}</div>
                        <p>“{r.message}”</p>
                        <footer>{r.customer_name}</footer>
                      </blockquote>
                    ))}
            </div>
            {!showSkeleton && q.hasNextPage && (
              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <button
                  className='btn'
                  onClick={() => void q.fetchNextPage()}
                  disabled={q.isFetchingNextPage}
                >
                  {q.isFetchingNextPage ? 'Memuat...' : 'Muat Lebih Banyak'}
                </button>
              </div>
            )}
          </div>
          {/* <form
            className='panel form-stack'
            onSubmit={(e) => {
              e.preventDefault()
              m.mutate()
            }}
          >
            <h2>Tulis Review</h2>
            <label>
              Nama
              <input
                required
                value={form.customer_name}
                onChange={(e) =>
                  setForm({ ...form, customer_name: e.target.value })
                }
              />
            </label>
            <label>
              Rating
              <select
                value={form.rating}
                onChange={(e) =>
                  setForm({ ...form, rating: Number(e.target.value) })
                }
              >
                {[5, 4, 3, 2, 1].map((v) => (
                  <option key={v} value={v}>
                    {v} bintang
                  </option>
                ))}
              </select>
            </label>
            <label>
              Pesan
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </label>
            <button className='btn' disabled={m.isPending}>
              {m.isPending ? 'Mengirim...' : 'Kirim Review'}
            </button>
            {m.isSuccess && (
              <p className='success'>
                Review terkirim dan menunggu persetujuan admin.
              </p>
            )}
            {m.error && <p className='error'>{m.error.message}</p>}
          </form> */}
        </div>
      </section>
    </>
  )
}
