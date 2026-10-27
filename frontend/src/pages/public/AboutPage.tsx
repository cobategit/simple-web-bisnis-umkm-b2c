import { useQuery } from '@tanstack/react-query'
import { apiFetch, type ApiResult } from '../../api/client'
import type { SiteSettings } from '../../types'
import { Skeleton } from '../../components/Skeleton'
import { usePublicSkeleton } from '../../components/public/PublicLoadingContext'
import { getMapEmbedSrc, getMapDirectLink } from '../../utils/maps'
import { SEO } from '../../components/SEO'
import DOMPurify from 'dompurify'

type Page = { key: string; title: string; content: string }

export function AboutPage() {
  const page = useQuery({
    queryKey: ['page', 'about'],
    queryFn: () => apiFetch<ApiResult<Page>>('/public/pages/about'),
  })
  const site = useQuery({
    queryKey: ['site'],
    queryFn: () => apiFetch<ApiResult<SiteSettings>>('/public/site'),
  })
  const showPageSkeleton = usePublicSkeleton(page.isLoading)
  const showSiteSkeleton = usePublicSkeleton(site.isLoading)
  const s = site.data?.data

  const mapEmbedSrc = getMapEmbedSrc(s?.maps_embed_url, s?.address)
  const mapDirectLink = getMapDirectLink(s?.maps_url, s?.address)

  const businessName = s?.business_name || 'DR Printing'
  const aboutTitle = `Tentang Kami - ${businessName}`
  const aboutDesc =
    page.data?.data.content?.slice(0, 160) ||
    `Profil, workshop percetakan, dan kontak resmi ${businessName}.`

  const aboutJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'PrintShop',
    name: businessName,
    description: aboutDesc,
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
        title={aboutTitle}
        description={aboutDesc}
        canonicalPath='/about'
        siteName={businessName}
        jsonLd={aboutJsonLd}
      />
      <section className='section page-top'>
        <div className='container'>
          <div className='about-grid'>
            <div>
              <span className='eyebrow'>ABOUT</span>
              {showPageSkeleton ? (
                <div style={{ margin: '14px 0 24px' }}>
                  <Skeleton
                    width={220}
                    height={36}
                    style={{ marginBottom: 16 }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <Skeleton width='100%' height={18} />
                    <Skeleton width='95%' height={18} />
                    <Skeleton width='98%' height={18} />
                    <Skeleton
                      width='70%'
                      height={18}
                      style={{ marginBottom: 12 }}
                    />
                    <Skeleton width='100%' height={18} />
                    <Skeleton width='92%' height={18} />
                    <Skeleton width='85%' height={18} />
                  </div>
                </div>
              ) : (
                <>
                  <h1>{page.data?.data.title || 'Tentang Kami'}</h1>
                  <div
                    className='prose'
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(page.data?.data.content || ''),
                    }}
                  />
                </>
              )}
            </div>
            <aside className='panel'>
              {showSiteSkeleton ? (
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                >
                  <Skeleton width={140} height={24} />
                  <Skeleton
                    width={200}
                    height={16}
                    style={{ marginBottom: 12 }}
                  />
                  <Skeleton width='100%' height={32} />
                  <Skeleton width='100%' height={32} />
                  <Skeleton width='100%' height={32} />
                </div>
              ) : (
                <>
                  <h3>{s?.business_name || 'DR Printing'}</h3>
                  <p>{s?.tagline}</p>
                  <dl className='contact-list'>
                    <div>
                      <dt>WhatsApp</dt>
                      <dd>{s?.whatsapp || '-'}</dd>
                    </div>
                    <div>
                      <dt>Email</dt>
                      <dd>{s?.email || '-'}</dd>
                    </div>
                    <div>
                      <dt>Alamat</dt>
                      <dd>
                        {s?.address || '-'}
                        {mapDirectLink && (
                          <div style={{ marginTop: '8px' }}>
                            <a
                              href='#lokasi-workshop'
                              className='contact-map-link'
                            >
                              📍 Lihat di Peta ↓
                            </a>
                          </div>
                        )}
                      </dd>
                    </div>
                  </dl>
                </>
              )}
            </aside>
          </div>

          {/* Section Peta Lokasi Google Maps */}
          <div id='lokasi-workshop' className='about-map-card panel'>
            <div className='about-map-header'>
              <div>
                <span className='eyebrow'>LOKASI WORKSHOP</span>
                <h2>Kunjungi Percetakan Kami</h2>
                <p className='about-map-address'>
                  {showSiteSkeleton ? (
                    <Skeleton width={320} height={20} />
                  ) : (
                    s?.address ||
                    'Kunjungi workshop kami untuk konsultasi sampel bahan, cek bukti cetak, dan pemesanan langsung.'
                  )}
                </p>
              </div>
              {!showSiteSkeleton && mapDirectLink && (
                <a
                  href={mapDirectLink}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='btn btn-sm about-map-btn'
                >
                  <span>Buka di Google Maps</span>
                  <span>↗</span>
                </a>
              )}
            </div>

            <div className='about-map-frame-wrapper'>
              {showSiteSkeleton ? (
                <Skeleton
                  width='100%'
                  height={380}
                  style={{ borderRadius: 16 }}
                />
              ) : mapEmbedSrc ? (
                <iframe
                  src={mapEmbedSrc}
                  className='about-map-iframe'
                  title={`Peta Lokasi ${s?.business_name || 'Percetakan'}`}
                  loading='lazy'
                  referrerPolicy='no-referrer-when-downgrade'
                  allowFullScreen
                />
              ) : (
                <div className='about-map-empty'>
                  <p>
                    Informasi peta lokasi belum dikonfigurasi melalui panel CMS.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
