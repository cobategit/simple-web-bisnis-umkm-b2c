import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { apiFetch, assetUrl, type ApiResult } from '../../api/client'
import type { Article, Product, Review, SiteSettings } from '../../types'
import {
  ProductCardSkeleton,
  ArticleCardSkeleton,
  ReviewCardSkeleton,
  Skeleton,
} from '../../components/Skeleton'
import { usePublicSkeleton } from '../../components/public/PublicLoadingContext'
import { SEO } from '../../components/SEO'

const rupiah = (v: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(v)

// Ambang batas jumlah review untuk mengaktifkan scroll horizontal
const REVIEW_SCROLL_THRESHOLD = 3

export function HomePage() {
  const site = useQuery({
    queryKey: ['site'],
    queryFn: () => apiFetch<ApiResult<SiteSettings>>('/public/site'),
  })
  const products = useQuery({
    queryKey: ['products'],
    queryFn: () => apiFetch<ApiResult<Product[]>>('/public/products'),
  })
  const articles = useQuery({
    queryKey: ['articles'],
    queryFn: () => apiFetch<ApiResult<Article[]>>('/public/articles'),
  })
  const reviews = useQuery({
    queryKey: ['reviews'],
    queryFn: () => apiFetch<ApiResult<Review[]>>('/public/reviews'),
  })
  const showSiteSkeleton = usePublicSkeleton(site.isLoading)
  const showProductsSkeleton = usePublicSkeleton(products.isLoading)
  const showArticlesSkeleton = usePublicSkeleton(articles.isLoading)
  const showReviewsSkeleton = usePublicSkeleton(reviews.isLoading)
  const s = site.data?.data

  const reviewsList = reviews.data?.data ?? []
  const isScrollable =
    !showReviewsSkeleton && reviewsList.length > REVIEW_SCROLL_THRESHOLD
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanScrollLeft(scrollLeft > 4)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !isScrollable) return
    updateScrollButtons()
    el.addEventListener('scroll', updateScrollButtons, { passive: true })
    window.addEventListener('resize', updateScrollButtons)
    return () => {
      el.removeEventListener('scroll', updateScrollButtons)
      window.removeEventListener('resize', updateScrollButtons)
    }
  }, [isScrollable, reviewsList.length, updateScrollButtons])

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const scrollAmount = Math.max(el.clientWidth * 0.75, 300)
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  const businessName = s?.business_name || 'DR Printing'
  const siteTitle = s?.tagline
    ? `${businessName} - ${s.tagline}`
    : `${businessName} - Percetakan & Digital Printing Cepat Terpercaya`
  const siteDesc =
    s?.hero_subtitle ||
    s?.tagline ||
    'Layanan percetakan dan digital printing cepat, rapi, dan terpercaya.'

  const localBusinessJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'PrintShop',
    name: businessName,
    description: siteDesc,
    telephone: s?.whatsapp ? `+${s.whatsapp}` : undefined,
    email: s?.email || undefined,
    address: s?.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: s.address,
          addressCountry: 'ID',
        }
      : undefined,
    hasMap: s?.maps_url || undefined,
  }

  return (
    <>
      <SEO
        title={siteTitle}
        description={siteDesc}
        canonicalPath='/'
        siteName={businessName}
        jsonLd={localBusinessJsonLd}
      />
      <section className='hero'>
        <div className='container hero-grid'>
          <div>
            <span className='eyebrow'>PRINTING · BRANDING · PROMOTION</span>
            {showSiteSkeleton && !s ? (
              <div style={{ margin: '14px 0 20px' }}>
                <Skeleton
                  width='90%'
                  height={48}
                  style={{ marginBottom: 10 }}
                />
                <Skeleton
                  width='70%'
                  height={48}
                  style={{ marginBottom: 16 }}
                />
                <Skeleton width='85%' height={20} style={{ marginBottom: 8 }} />
                <Skeleton width='65%' height={20} />
              </div>
            ) : (
              <>
                <h1>
                  {s?.hero_title ||
                    'Solusi Printing untuk Bisnis dan Kebutuhan Harian'}
                </h1>
                <p>
                  {s?.hero_subtitle ||
                    'Cetak cepat, rapi, dengan proses pemesanan yang sederhana.'}
                </p>
              </>
            )}
            <div className='hero-actions'>
              <Link className='btn' to='/produk'>
                Lihat Produk
              </Link>
              <Link className='btn btn-secondary' to='/about'>
                Tentang Kami
              </Link>
            </div>
            <div className='hero-stats'>
              <div>
                <strong>Fast</strong>
                <span>Respon & produksi</span>
              </div>
              <div>
                <strong>300 DPI</strong>
                <span>File-ready guidance</span>
              </div>
              <div>
                <strong>Custom</strong>
                <span>Ukuran & finishing</span>
              </div>
            </div>
          </div>
          <div className='hero-visual'>
            <img src='/logo-dr.jpeg' alt='Logo DR' className='hero-image' />
          </div>
        </div>
      </section>

      <section className='section'>
        <div className='container'>
          <div className='section-head'>
            <div>
              <span className='eyebrow'>PRODUK POPULER</span>
              <h2>Cetak yang paling sering dipesan</h2>
            </div>
            <Link to='/produk'>Lihat semua →</Link>
          </div>
          <div className='card-grid'>
            {showProductsSkeleton
              ? Array.from({ length: 3 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))
              : (products.data?.data ?? []).slice(0, 3).map((p) => (
                  <Link
                    className='product-card product-card-link'
                    to={`/produk/${p.slug}`}
                    key={p.id}
                  >
                    {p.image_url ? (
                      <img src={assetUrl(p.image_url)} alt={p.name} />
                    ) : (
                      <div className='image-placeholder'>{p.category}</div>
                    )}
                    <div className='card-body'>
                      <span className='pill'>{p.category}</span>
                      <h3>{p.name}</h3>
                      <p>{p.short_description}</p>
                      <div className='product-card-footer'>
                        <strong>Mulai {rupiah(p.price_start)}</strong>
                        <span>Lihat detail →</span>
                      </div>
                    </div>
                  </Link>
                ))}
          </div>
        </div>
      </section>

      <section className='section section-soft'>
        <div className='container'>
          <div className='section-head'>
            <div>
              <span className='eyebrow'>ARTIKEL</span>
              <h2>Tips sebelum naik cetak</h2>
            </div>
            <Link to='/artikel'>Semua artikel →</Link>
          </div>
          <div className='article-grid'>
            {showArticlesSkeleton
              ? Array.from({ length: 3 }).map((_, i) => (
                  <ArticleCardSkeleton key={i} />
                ))
              : (articles.data?.data ?? []).slice(0, 3).map((a) => (
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

      <section className='section'>
        <div className='container'>
          <div className='section-head'>
            <div>
              <span className='eyebrow'>TESTIMONI</span>
              <h2>Dipercaya pelanggan</h2>
            </div>
            <div className='section-actions'>
              <Link to='/review'>Tulis review →</Link>
              {isScrollable && (
                <div className='scroll-nav-buttons'>
                  <button
                    type='button'
                    className='scroll-arrow-btn'
                    onClick={() => handleScroll('left')}
                    disabled={!canScrollLeft}
                    aria-label='Scroll testimoni ke kiri'
                  >
                    <svg
                      width='16'
                      height='16'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2.5'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    >
                      <polyline points='15 18 9 12 15 6' />
                    </svg>
                  </button>
                  <button
                    type='button'
                    className='scroll-arrow-btn'
                    onClick={() => handleScroll('right')}
                    disabled={!canScrollRight}
                    aria-label='Scroll testimoni ke kanan'
                  >
                    <svg
                      width='16'
                      height='16'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2.5'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    >
                      <polyline points='9 18 15 12 9 6' />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
          <div
            ref={scrollRef}
            className={`review-grid ${isScrollable ? 'review-scroll' : ''}`}
          >
            {showReviewsSkeleton
              ? Array.from({ length: 3 }).map((_, i) => (
                  <ReviewCardSkeleton key={i} />
                ))
              : reviewsList.map((r) => (
                  <blockquote key={r.id}>
                    <div className='stars'>{'★'.repeat(r.rating)}</div>
                    <p>“{r.message}”</p>
                    <footer>{r.customer_name}</footer>
                  </blockquote>
                ))}
          </div>
        </div>
      </section>
    </>
  )
}
