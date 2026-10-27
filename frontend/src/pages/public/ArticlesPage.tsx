import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { apiFetch, assetUrl, type ApiResult } from '../../api/client'
import type { Article } from '../../types'
import { ArticleCardSkeleton } from '../../components/Skeleton'
import { usePublicSkeleton } from '../../components/public/PublicLoadingContext'
import { SEO } from '../../components/SEO'

export function ArticlesPage() {
  const q = useQuery({
    queryKey: ['articles'],
    queryFn: () => apiFetch<ApiResult<Article[]>>('/public/articles'),
  })
  const showSkeleton = usePublicSkeleton(q.isLoading)

  return (
    <>
      <SEO
        title='Artikel, Tips & Wawasan Percetakan'
        description='Kumpulan panduan menyiapkan file cetak, memilih bahan percetakan yang tepat, dan tips digital printing untuk bisnis dari DR Printing.'
        canonicalPath='/artikel'
      />
      <section className='section page-top'>
        <div className='container'>
          <span className='eyebrow'>INSIGHT</span>
          <h1>Artikel Printing</h1>
          <p className='lead'>
            Panduan file, bahan, finishing, dan ide cetak untuk kebutuhan
            bisnis.
          </p>
          <div className='article-grid'>
            {showSkeleton
              ? Array.from({ length: 6 }).map((_, i) => (
                  <ArticleCardSkeleton key={i} />
                ))
              : (q.data?.data ?? []).map((a) => (
                  <Link
                    className='article-card'
                    to={`/artikel/${a.slug}`}
                    key={a.id}
                  >
                    <div className='article-cover'>
                      {a.cover_image_url ? (
                        <img src={assetUrl(a.cover_image_url)} alt='' />
                      ) : (
                        <span>PRINT GUIDE</span>
                      )}
                    </div>
                    <div>
                      <h3>{a.title}</h3>
                      <p>{a.excerpt}</p>
                    </div>
                  </Link>
                ))}
          </div>
        </div>
      </section>
    </>
  )
}
