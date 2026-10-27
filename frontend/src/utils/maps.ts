/**
 * Ekstrak URL embed dari string input (baik berupa URL langsung maupun tag <iframe src="...">)
 */
export function extractEmbedUrl(input: string): string {
  if (!input) return ''
  const trimmed = input.trim()
  if (trimmed.startsWith('<iframe') || trimmed.includes('<iframe')) {
    const match = trimmed.match(/src=["']([^"']+)["']/i)
    if (match && match[1]) {
      return match[1]
    }
  }
  return trimmed
}

/**
 * Dapatkan URL embed Google Maps. Jika maps_embed_url tidak diisi, gunakan fallback query alamat.
 */
export function getMapEmbedSrc(mapsEmbedUrl?: string, address?: string): string {
  const extracted = extractEmbedUrl(mapsEmbedUrl || '')
  if (extracted) return extracted
  if (address && address.trim().length > 0) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(address.trim())}&t=&z=15&ie=UTF8&iwloc=&output=embed`
  }
  return ''
}

/**
 * Dapatkan link langsung untuk membuka Google Maps (untuk navigasi / buka di aplikasi Maps).
 */
export function getMapDirectLink(mapsUrl?: string, address?: string): string {
  if (mapsUrl && mapsUrl.trim().length > 0) {
    return mapsUrl.trim()
  }
  if (address && address.trim().length > 0) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`
  }
  return ''
}

