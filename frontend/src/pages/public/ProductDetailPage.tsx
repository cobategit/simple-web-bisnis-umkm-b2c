import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { apiFetch, assetUrl, type ApiResult } from '../../api/client'
import type { Product, SiteSettings } from '../../types'
import { EmptyState } from '../../components/EmptyState'
import { ProductDetailSkeleton } from '../../components/Skeleton'
import { usePublicSkeleton } from '../../components/public/PublicLoadingContext'
import { SEO } from '../../components/SEO'

const rupiah = (v: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(v)

function normalizeWhatsApp(value: string) {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('0')) return `62${digits.slice(1)}`
  return digits
}

function InfoList({ title, values }: { title: string; values: string[] }) {
  if (!values.length) return null
  return (
    <div className='product-spec-card'>
      <span>{title}</span>
      <ul>
        {values.map((value) => (
          <li key={value}>{value}</li>
        ))}
      </ul>
    </div>
  )
}

function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='currentColor'
      aria-hidden='true'
    >
      <path d='M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.63C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.59 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67ZM8.94 7.22C8.76 7.22 8.46 7.29 8.22 7.55C7.97 7.82 7.27 8.48 7.27 9.83C7.27 11.18 8.25 12.49 8.39 12.67C8.53 12.86 10.32 15.62 13.06 16.8C13.71 17.08 14.22 17.25 14.61 17.37C15.27 17.58 15.87 17.55 16.34 17.48C16.87 17.4 17.97 16.81 18.2 16.17C18.43 15.52 18.43 14.97 18.36 14.85C18.29 14.73 18.11 14.67 17.83 14.53C17.56 14.39 16.23 13.73 15.98 13.64C15.73 13.55 15.55 13.5 15.37 13.78C15.18 14.05 14.66 14.67 14.5 14.85C14.35 15.04 14.19 15.06 13.92 14.92C13.64 14.78 12.75 14.49 11.7 13.55C10.88 12.82 10.33 11.92 10.17 11.64C10.01 11.36 10.15 11.22 10.29 11.08C10.42 10.95 10.57 10.75 10.71 10.59C10.85 10.42 10.9 10.31 10.99 10.12C11.08 9.94 11.04 9.78 10.97 9.64C10.9 9.5 10.35 8.14 10.12 7.59C9.9 7.05 9.67 7.13 9.5 7.12C9.33 7.11 9.15 7.11 8.94 7.22Z' />
    </svg>
  )
}

function ExpandIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <polyline points='15 3 21 3 21 9' />
      <polyline points='9 21 3 21 3 15' />
      <line x1='21' y1='3' x2='14' y2='10' />
      <line x1='3' y1='21' x2='10' y2='14' />
    </svg>
  )
}

function CloseIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <line x1='18' y1='6' x2='6' y2='18' />
      <line x1='6' y1='6' x2='18' y2='18' />
    </svg>
  )
}

export function ProductDetailPage() {
  const { slug = '' } = useParams()
  const productQuery = useQuery({
    queryKey: ['product', slug],
    queryFn: () => apiFetch<ApiResult<Product>>(`/public/products/${slug}`),
    enabled: !!slug,
  })
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: () => apiFetch<ApiResult<Product[]>>('/public/products'),
  })
  const siteQuery = useQuery({
    queryKey: ['site'],
    queryFn: () => apiFetch<ApiResult<SiteSettings>>('/public/site'),
  })
  const product = productQuery.data?.data
  const [activeIndex, setActiveIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const lightboxTouchStartX = useRef<number | null>(null)

  const gallery = useMemo(() => {
    if (!product) return []
    return Array.from(
      new Set(
        [product.image_url, ...(product.gallery_urls ?? [])].filter(Boolean),
      ),
    )
  }, [product])

  useEffect(() => {
    setActiveIndex(0)
    setIsLightboxOpen(false)
  }, [product?.id])

  const activeImage = gallery[activeIndex] ?? ''

  function showPreviousImage() {
    if (gallery.length < 2) return
    setActiveIndex((current) => (current - 1 + gallery.length) % gallery.length)
  }

  function showNextImage() {
    if (gallery.length < 2) return
    setActiveIndex((current) => (current + 1) % gallery.length)
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartX.current = event.touches[0]?.clientX ?? null
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (touchStartX.current == null || gallery.length < 2) return
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current
    const distance = endX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(distance) < 45) return
    if (distance > 0) showPreviousImage()
    else showNextImage()
  }

  function handleLightboxTouchStart(event: TouchEvent<HTMLDivElement>) {
    lightboxTouchStartX.current = event.touches[0]?.clientX ?? null
  }

  function handleLightboxTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (lightboxTouchStartX.current == null || gallery.length < 2) return
    const endX = event.changedTouches[0]?.clientX ?? lightboxTouchStartX.current
    const distance = endX - lightboxTouchStartX.current
    lightboxTouchStartX.current = null
    if (Math.abs(distance) < 45) return
    if (distance > 0) showPreviousImage()
    else showNextImage()
  }

  useEffect(() => {
    if (!isLightboxOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsLightboxOpen(false)
      } else if (event.key === 'ArrowLeft') {
        showPreviousImage()
      } else if (event.key === 'ArrowRight') {
        showNextImage()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isLightboxOpen, gallery.length])

  const related = useMemo(() => {
    if (!product) return []
    const all = productsQuery.data?.data ?? []
    return [...all]
      .filter((item) => item.id !== product.id)
      .sort(
        (a, b) =>
          Number(b.category === product.category) -
          Number(a.category === product.category),
      )
      .slice(0, 3)
  }, [product, productsQuery.data])

  const showSkeleton = usePublicSkeleton(productQuery.isLoading)

  if (showSkeleton) {
    return <ProductDetailSkeleton />
  }
  if (productQuery.isError || !product)
    return (
      <section className='section page-top'>
        <div className='container'>
          <EmptyState
            title='Produk tidak ditemukan'
            text='Produk mungkin belum dipublikasikan atau sudah tidak tersedia.'
          />
          <div className='detail-back'>
            <Link className='btn btn-secondary' to='/produk'>
              ← Kembali ke Produk
            </Link>
          </div>
        </div>
      </section>
    )

  const phone = normalizeWhatsApp(siteQuery.data?.data.whatsapp ?? '')
  const businessName = siteQuery.data?.data.business_name || 'DR Printing'
  const formattedPrice = rupiah(product.price_start)
  const priceInfo =
    product.price_start > 0
      ? `harga mulai dari ${formattedPrice}`
      : 'harga konfirmasi'
  const whatsappMessage = `Halo ${businessName}, saya ingin menanyakan tentang produk *${product.name}* (${priceInfo}). Apakah produk ini masih tersedia dan bisa konsultasi lebih lanjut mengenai spesifikasi serta pemesanannya? Terima kasih.`
  const whatsappText = encodeURIComponent(whatsappMessage)
  const whatsappHref = phone
    ? `https://wa.me/${phone}?text=${whatsappText}`
    : ''

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const productImageUrl = product.image_url
    ? assetUrl(product.image_url)
    : undefined

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: productImageUrl,
    description: product.short_description || product.description,
    category: product.category,
    brand: {
      '@type': 'Brand',
      name: businessName,
    },
    offers: {
      '@type': 'Offer',
      url: `${origin}/produk/${product.slug}`,
      priceCurrency: 'IDR',
      price: product.price_start,
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: businessName,
      },
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
        name: 'Produk',
        item: `${origin}/produk`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.name,
        item: `${origin}/produk/${product.slug}`,
      },
    ],
  }

  return (
    <>
      <SEO
        title={`Cetak ${product.name}`}
        description={
          product.short_description ||
          product.description ||
          `Layanan cetak ${product.name} cepat dan berkualitas.`
        }
        canonicalPath={`/produk/${product.slug}`}
        image={productImageUrl}
        type='product'
        siteName={businessName}
        jsonLd={[productJsonLd, breadcrumbJsonLd]}
      />
      <section className='product-detail-hero'>
        <div className='container'>
          <div className='product-breadcrumb'>
            <Link to='/produk'>Produk</Link>
            <span>/</span>
            <span>{product.name}</span>
          </div>
          <div className='product-detail-grid'>
            <div className='product-gallery'>
              <div
                className='product-slider'
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowLeft') showPreviousImage()
                  if (event.key === 'ArrowRight') showNextImage()
                }}
                tabIndex={gallery.length > 1 ? 0 : -1}
                aria-label={`Galeri ${product.name}`}
              >
                <div
                  className={`product-main-image ${activeImage ? 'has-image' : ''}`}
                  role={activeImage ? 'button' : undefined}
                  tabIndex={activeImage ? 0 : undefined}
                  onClick={() => {
                    if (activeImage) setIsLightboxOpen(true)
                  }}
                  onKeyDown={(event) => {
                    if (
                      activeImage &&
                      (event.key === 'Enter' || event.key === ' ')
                    ) {
                      event.preventDefault()
                      setIsLightboxOpen(true)
                    }
                  }}
                  title={
                    activeImage
                      ? 'Klik untuk melihat gambar keseluruhan'
                      : undefined
                  }
                  aria-label={
                    activeImage
                      ? `${product.name} - Klik untuk melihat gambar keseluruhan`
                      : undefined
                  }
                >
                  {activeImage ? (
                    <>
                      <img
                        key={activeImage}
                        className='product-slide-image'
                        src={assetUrl(activeImage)}
                        alt={`${product.name} gambar ${activeIndex + 1}`}
                      />
                      <div
                        className='product-image-zoom-badge'
                        aria-hidden='true'
                      >
                        <ExpandIcon size={14} />
                        <span>Lihat Penuh</span>
                      </div>
                    </>
                  ) : (
                    <div className='image-placeholder'>{product.category}</div>
                  )}
                </div>

                {gallery.length > 1 && (
                  <>
                    <button
                      className='product-slider-arrow product-slider-prev'
                      type='button'
                      aria-label='Gambar sebelumnya'
                      onClick={(e) => {
                        e.stopPropagation()
                        showPreviousImage()
                      }}
                    >
                      ‹
                    </button>
                    <button
                      className='product-slider-arrow product-slider-next'
                      type='button'
                      aria-label='Gambar berikutnya'
                      onClick={(e) => {
                        e.stopPropagation()
                        showNextImage()
                      }}
                    >
                      ›
                    </button>
                    <div className='product-slider-counter' aria-live='polite'>
                      {activeIndex + 1} / {gallery.length}
                    </div>
                  </>
                )}
              </div>

              {gallery.length > 1 && (
                <div
                  className='product-thumbnails'
                  aria-label='Pilih gambar produk'
                >
                  {gallery.map((image, index) => (
                    <button
                      className={activeIndex === index ? 'active' : ''}
                      type='button'
                      key={`${image}-${index}`}
                      onClick={() => setActiveIndex(index)}
                      aria-label={`Tampilkan gambar ${index + 1}`}
                    >
                      <img src={assetUrl(image)} alt='' />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className='product-detail-summary'>
              <span className='pill'>{product.category}</span>
              <h1>{product.name}</h1>
              <p className='product-short-description'>
                {product.short_description}
              </p>
              <div className='product-price'>
                <small>Harga mulai</small>
                <strong>{rupiah(product.price_start)}</strong>
              </div>

              <div className='product-quick-info'>
                <div>
                  <span>Minimum order</span>
                  <strong>
                    {product.min_order > 0
                      ? product.min_order.toLocaleString('id-ID')
                      : 'Hubungi kami'}
                  </strong>
                </div>
                <div>
                  <span>Estimasi produksi</span>
                  <strong>
                    {product.production_time || 'Konfirmasi admin'}
                  </strong>
                </div>
              </div>

              {product.order_note && (
                <div className='order-note'>
                  <strong>Catatan pemesanan</strong>
                  <p>{product.order_note}</p>
                </div>
              )}

              <div className='product-detail-actions'>
                {whatsappHref ? (
                  <a
                    className='btn btn-whatsapp'
                    href={whatsappHref}
                    target='_blank'
                    rel='noreferrer'
                  >
                    <WhatsAppIcon size={20} />
                    <span>Tanya via WhatsApp</span>
                  </a>
                ) : (
                  <Link className='btn' to='/about'>
                    Hubungi Kami
                  </Link>
                )}
                <Link className='btn btn-secondary' to='/produk'>
                  Lihat Produk Lain
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className='section product-detail-content'>
        <div className='container product-content-grid'>
          <div>
            <span className='eyebrow'>DETAIL PRODUK</span>
            <h2>Tentang {product.name}</h2>
            <div className='prose product-description'>
              {product.description || product.short_description}
            </div>

            {!!product.features?.length && (
              <div className='feature-section'>
                <h3>Keunggulan produk</h3>
                <div className='feature-list'>
                  {(product.features ?? []).map((feature) => (
                    <div key={feature}>
                      <span>✓</span>
                      <p>{feature}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className='product-specs'>
            <InfoList title='Pilihan bahan' values={product.materials ?? []} />
            <InfoList title='Pilihan ukuran' values={product.sizes ?? []} />
            <InfoList
              title='Pilihan finishing'
              values={product.finishing ?? []}
            />
          </aside>
        </div>
      </section>

      {!!related.length && (
        <section className='section section-soft'>
          <div className='container'>
            <div className='section-head'>
              <div>
                <span className='eyebrow'>PRODUK LAIN</span>
                <h2>Mungkin Anda juga butuh</h2>
              </div>
              <Link to='/produk'>Lihat semua →</Link>
            </div>
            <div className='card-grid'>
              {related.map((item) => (
                <Link
                  className='product-card product-card-link'
                  to={`/produk/${item.slug}`}
                  key={item.id}
                >
                  {item.image_url ? (
                    <img src={assetUrl(item.image_url)} alt={item.name} />
                  ) : (
                    <div className='image-placeholder'>{item.category}</div>
                  )}
                  <div className='card-body'>
                    <span className='pill'>{item.category}</span>
                    <h3>{item.name}</h3>
                    <p>{item.short_description}</p>
                    <strong>Mulai {rupiah(item.price_start)}</strong>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {whatsappHref && (
        <a
          className='floating-wa-btn'
          href={whatsappHref}
          target='_blank'
          rel='noreferrer'
          aria-label={`Chat WhatsApp untuk menanyakan produk ${product.name}`}
        >
          <WhatsAppIcon size={22} />
          <span>Chat WhatsApp</span>
        </a>
      )}

      {isLightboxOpen &&
        activeImage &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className='product-lightbox-overlay'
            role='dialog'
            aria-modal='true'
            aria-label={`Tampilan penuh gambar ${product.name}`}
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsLightboxOpen(false)
            }}
          >
            <div className='lightbox-header'>
              <div className='lightbox-info'>
                {gallery.length > 1 && (
                  <span className='lightbox-counter' aria-live='polite'>
                    {activeIndex + 1} / {gallery.length}
                  </span>
                )}
                <span className='lightbox-title'>{product.name}</span>
              </div>
              <button
                type='button'
                className='lightbox-close-btn'
                onClick={() => setIsLightboxOpen(false)}
                aria-label='Tutup tampilan penuh'
                title='Tutup (Esc)'
              >
                <CloseIcon size={22} />
              </button>
            </div>

            <div
              className='lightbox-body'
              onClick={(e) => {
                if (e.target === e.currentTarget) setIsLightboxOpen(false)
              }}
              onTouchStart={handleLightboxTouchStart}
              onTouchEnd={handleLightboxTouchEnd}
            >
              {gallery.length > 1 && (
                <button
                  type='button'
                  className='lightbox-nav-btn lightbox-nav-prev'
                  onClick={(e) => {
                    e.stopPropagation()
                    showPreviousImage()
                  }}
                  aria-label='Gambar sebelumnya'
                  title='Gambar sebelumnya (Panah Kiri)'
                >
                  ‹
                </button>
              )}

              <div
                className='lightbox-image-wrapper'
                onClick={(e) => {
                  if (e.target === e.currentTarget) setIsLightboxOpen(false)
                }}
              >
                <img
                  key={activeImage}
                  className='lightbox-image'
                  src={assetUrl(activeImage)}
                  alt={`${product.name} tampilan penuh ${activeIndex + 1}`}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {gallery.length > 1 && (
                <button
                  type='button'
                  className='lightbox-nav-btn lightbox-nav-next'
                  onClick={(e) => {
                    e.stopPropagation()
                    showNextImage()
                  }}
                  aria-label='Gambar berikutnya'
                  title='Gambar berikutnya (Panah Kanan)'
                >
                  ›
                </button>
              )}
            </div>

            {gallery.length > 1 && (
              <div
                className='lightbox-thumbnails'
                aria-label='Pilih gambar produk'
                onClick={(e) => e.stopPropagation()}
              >
                {gallery.map((image, index) => (
                  <button
                    key={`lightbox-${image}-${index}`}
                    className={`lightbox-thumb ${activeIndex === index ? 'active' : ''}`}
                    type='button'
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Tampilkan gambar ${index + 1}`}
                  >
                    <img src={assetUrl(image)} alt='' />
                  </button>
                ))}
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}
