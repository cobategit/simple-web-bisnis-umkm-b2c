import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { apiFetch, assetUrl, type ApiResult } from '../../api/client'
import type { Article } from '../../types'
import { ArticleDetailSkeleton } from '../../components/Skeleton'
import { usePublicSkeleton } from '../../components/public/PublicLoadingContext'
import { SEO } from '../../components/SEO'

export function ArticleDetailPage() {
  const { slug } = useParams()
  const q = useQuery({
    queryKey: ['article', slug],
    queryFn: () => apiFetch<ApiResult<Article>>(`/public/articles/${slug}`),
    enabled: !!slug,
  })
  const showSkeleton = usePublicSkeleton(q.isLoading)

  if (showSkeleton) {
    return <ArticleDetailSkeleton />
  }

  if (q.isError || !q.data) {
    return <div className='center-screen'>Artikel tidak ditemukan.</div>
  }

  const a = q.data.data
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const articleImageUrl = a.cover_image_url
    ? assetUrl(a.cover_image_url)
    : undefined

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: a.excerpt,
    image: articleImageUrl,
    datePublished: a.published_at,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${origin}/artikel/${a.slug}`,
    },
    publisher: {
      '@type': 'Organization',
      name: 'DR Printing',
    },
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Beranda',
        item: `${origin}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Artikel',
        item: `${origin}/artikel`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: a.title,
        item: `${origin}/artikel/${a.slug}`,
      },
    ],
  }

  return (
    <>
      <SEO
        title={a.title}
        description={a.excerpt}
        canonicalPath={`/artikel/${a.slug}`}
        image={articleImageUrl}
        type='article'
        jsonLd={[articleJsonLd, breadcrumbJsonLd]}
      />
      <article className='article-detail container page-top'>
        <Link to='/artikel'>← Kembali ke artikel</Link>
        <span className='eyebrow'>ARTIKEL</span>
        <h1>{a.title}</h1>
        <p className='lead'>{a.excerpt}</p>
        {a.cover_image_url && (
          <img
            className='detail-cover'
            src={assetUrl(a.cover_image_url)}
            alt={a.title}
          />
        )}
        <div className='prose'>
          {(a.content || '').split('\n').map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </article>
    </>
  )
}
