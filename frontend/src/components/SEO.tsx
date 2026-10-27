import { useEffect } from 'react'

export type SEOProps = {
  title?: string
  description?: string
  canonicalPath?: string
  image?: string
  type?: 'website' | 'article' | 'product'
  siteName?: string
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>
  noIndex?: boolean
}

function updateMetaTag(attribute: 'name' | 'property', name: string, content?: string | null) {
  let element = document.querySelector(`meta[${attribute}="${name}"]`)
  if (!content) {
    if (element) element.remove()
    return
  }
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, name)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function updateCanonicalLink(url?: string | null) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!url) {
    if (link) link.remove()
    return
  }
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', url)
}

function updateJsonLd(jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>) {
  const SCRIPT_ID = 'seo-structured-data'
  let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null

  if (!jsonLd) {
    if (script) script.remove()
    return
  }

  if (!script) {
    script = document.createElement('script')
    script.id = SCRIPT_ID
    script.type = 'application/ld+json'
    document.head.appendChild(script)
  }

  try {
    script.textContent = JSON.stringify(jsonLd)
  } catch {
    // Abaikan jika serialisasi gagal
  }
}

export function SEO({
  title,
  description = 'PrintKu - layanan printing cepat, rapi, dan terpercaya.',
  canonicalPath,
  image,
  type = 'website',
  siteName = 'DR Printing',
  jsonLd,
  noIndex = false,
}: SEOProps) {
  useEffect(() => {
    // 1. Title
    const finalTitle = title ? (title.includes(siteName) ? title : `${title} | ${siteName}`) : siteName
    document.title = finalTitle

    // 2. Meta description & robots
    updateMetaTag('name', 'description', description)
    updateMetaTag('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow')

    // 3. Canonical URL
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const fullCanonicalUrl = canonicalPath ? `${origin}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}` : ''
    updateCanonicalLink(fullCanonicalUrl || null)

    // 4. Open Graph Image URL (pastikan absolute URL)
    let fullImageUrl = ''
    if (image) {
      fullImageUrl = image.startsWith('http') ? image : `${origin}${image.startsWith('/') ? image : `/${image}`}`
    }

    // 5. Open Graph tags
    updateMetaTag('property', 'og:title', finalTitle)
    updateMetaTag('property', 'og:description', description)
    updateMetaTag('property', 'og:type', type)
    updateMetaTag('property', 'og:site_name', siteName)
    if (fullCanonicalUrl) {
      updateMetaTag('property', 'og:url', fullCanonicalUrl)
    }
    if (fullImageUrl) {
      updateMetaTag('property', 'og:image', fullImageUrl)
    } else {
      updateMetaTag('property', 'og:image', null)
    }

    // 6. Twitter Cards
    updateMetaTag('name', 'twitter:card', fullImageUrl ? 'summary_large_image' : 'summary')
    updateMetaTag('name', 'twitter:title', finalTitle)
    updateMetaTag('name', 'twitter:description', description)
    if (fullImageUrl) {
      updateMetaTag('name', 'twitter:image', fullImageUrl)
    } else {
      updateMetaTag('name', 'twitter:image', null)
    }

    // 7. Structured Data (JSON-LD)
    updateJsonLd(jsonLd)

    return () => {
      // Saat unmount, bersihkan JSON-LD spesifik halaman agar tidak tertinggal ke halaman lain
      updateJsonLd(undefined)
    }
  }, [title, description, canonicalPath, image, type, siteName, jsonLd, noIndex])

  return null
}
