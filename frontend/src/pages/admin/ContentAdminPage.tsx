import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, type ApiResult } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import type { SiteSettings } from '../../types'
import {
  extractEmbedUrl,
  getMapEmbedSrc,
  getMapDirectLink,
} from '../../utils/maps'

import { CKEditor } from '@ckeditor/ckeditor5-react'
import {
  ClassicEditor,
  Essentials,
  Bold,
  Italic,
  Paragraph,
  Heading,
  List,
  Link,
} from 'ckeditor5'

type Page = { key: string; title: string; content: string }

const initial: SiteSettings = {
  business_name: '',
  tagline: '',
  hero_title: '',
  hero_subtitle: '',
  whatsapp: '',
  email: '',
  address: '',
  instagram: '',
  maps_url: '',
  maps_embed_url: '',
}

const editorConfig = {
  licenseKey: 'GPL',
  plugins: [Essentials, Bold, Italic, Paragraph, Heading, List, Link],
  toolbar: [
    'heading',
    '|',
    'bold',
    'italic',
    '|',
    'link',
    'bulletedList',
    'numberedList',
    '|',
    'undo',
    'redo',
  ],
  link: {
    defaultProtocol: 'https://',
    addTargetToExternalLinks: true,
  },
}

export function ContentAdminPage() {
  const { accessToken, can } = useAuth()
  const qc = useQueryClient()
  const pageQ = useQuery({
    queryKey: ['admin-about'],
    queryFn: () =>
      apiFetch<ApiResult<Page>>('/admin/pages/about', {}, accessToken),
    enabled: !!accessToken,
  })
  const settingsQ = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () =>
      apiFetch<ApiResult<SiteSettings>>('/admin/settings', {}, accessToken),
    enabled: !!accessToken,
  })
  const [about, setAbout] = useState({ title: 'Tentang Kami', content: '' })
  const [settings, setSettings] = useState(initial)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (pageQ.data)
      setAbout({
        title: pageQ.data.data.title,
        content: pageQ.data.data.content,
      })
  }, [pageQ.data])

  useEffect(() => {
    if (settingsQ.data) {
      setSettings({
        ...initial,
        ...settingsQ.data.data,
        maps_url: settingsQ.data.data.maps_url || '',
        maps_embed_url: settingsQ.data.data.maps_embed_url || '',
      })
    }
  }, [settingsQ.data])

  const savePage = useMutation({
    mutationFn: () =>
      apiFetch(
        '/admin/pages/about',
        { method: 'PUT', body: JSON.stringify(about) },
        accessToken,
      ),
    meta: { action: 'Menyimpan halaman About...' },
    onSuccess: () => {
      setMsg('Halaman About berhasil disimpan.')
      setError('')
      void qc.invalidateQueries({ queryKey: ['admin-about'] })
      void qc.invalidateQueries({ queryKey: ['page', 'about'] })
    },
    onError: (e) => {
      setError(e.message)
      setMsg('')
    },
  })

  const saveSettings = useMutation({
    mutationFn: () => {
      const payload: SiteSettings = {
        ...settings,
        maps_embed_url: extractEmbedUrl(settings.maps_embed_url || ''),
        maps_url: (settings.maps_url || '').trim(),
      }
      return apiFetch(
        '/admin/settings',
        { method: 'PUT', body: JSON.stringify(payload) },
        accessToken,
      )
    },
    meta: { action: 'Menyimpan pengaturan website & peta lokasi...' },
    onSuccess: () => {
      setMsg('Pengaturan website dan lokasi berhasil disimpan.')
      void qc.invalidateQueries({ queryKey: ['site'] })
    },
    onError: (e) => {
      setError(e.message)
      setMsg('')
    },
  })

  // Perhitungan live preview peta
  const previewEmbedSrc = getMapEmbedSrc(
    settings.maps_embed_url,
    settings.address,
  )
  const previewDirectLink = getMapDirectLink(
    settings.maps_url,
    settings.address,
  )

  const handleEmbedChange = (val: string) => {
    // Jika user menempelkan kode iframe lengkap, langsung ekstrak URL-nya
    const cleaned = extractEmbedUrl(val)
    setSettings({ ...settings, maps_embed_url: cleaned })
  }

  const handleUseAddressFallback = () => {
    if (!settings.address.trim()) {
      alert('Isi alamat terlebih dahulu.')
      return
    }
    const generated = `https://maps.google.com/maps?q=${encodeURIComponent(
      settings.address.trim(),
    )}&t=&z=15&ie=UTF8&iwloc=&output=embed`
    setSettings({
      ...settings,
      maps_embed_url: generated,
      maps_url:
        settings.maps_url ||
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          settings.address.trim(),
        )}`,
    })
  }

  return (
    <div className='admin-page'>
      <div className='admin-title'>
        <div>
          <span className='eyebrow'>CMS</span>
          <h1>Konten & Lokasi</h1>
          <p>
            Kelola identitas website, kontak, lokasi peta Google Maps, dan
            halaman About.
          </p>
        </div>
      </div>

      {msg && (
        <div
          style={{
            padding: '12px 16px',
            background: '#ecfdf5',
            color: '#065f46',
            border: '1px solid #a7f3d0',
            borderRadius: '10px',
            marginBottom: '16px',
            fontWeight: 500,
          }}
        >
          {msg}
        </div>
      )}

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

      {/* Form Identitas & Lokasi */}
      <form
        className='panel form-grid'
        onSubmit={(e) => {
          e.preventDefault()
          saveSettings.mutate()
        }}
      >
        <h2>Identitas Website & Hero</h2>

        <label>
          Nama Bisnis
          <input
            value={settings.business_name}
            onChange={(e) =>
              setSettings({ ...settings, business_name: e.target.value })
            }
            placeholder='contoh: DR Printing'
            required
          />
        </label>

        <label>
          Tagline
          <input
            value={settings.tagline}
            onChange={(e) =>
              setSettings({ ...settings, tagline: e.target.value })
            }
            placeholder='contoh: Solusi cetak cepat dan berkualitas'
          />
        </label>

        <label className='span-2'>
          Judul Hero (Halaman Utama)
          <input
            value={settings.hero_title}
            onChange={(e) =>
              setSettings({ ...settings, hero_title: e.target.value })
            }
          />
        </label>

        <label className='span-2'>
          Subjudul Hero
          <textarea
            rows={2}
            value={settings.hero_subtitle}
            onChange={(e) =>
              setSettings({ ...settings, hero_subtitle: e.target.value })
            }
          />
        </label>

        <h2 style={{ marginTop: '16px' }}>Kontak & Media Sosial</h2>

        <label>
          Nomor WhatsApp
          <input
            value={settings.whatsapp}
            onChange={(e) =>
              setSettings({ ...settings, whatsapp: e.target.value })
            }
            placeholder='contoh: 08123456789'
          />
        </label>

        <label>
          Email Bisnis
          <input
            type='email'
            value={settings.email}
            onChange={(e) =>
              setSettings({ ...settings, email: e.target.value })
            }
            placeholder='contoh: halo@drprinting.com'
          />
        </label>

        <label className='span-2'>
          Instagram
          <input
            value={settings.instagram}
            onChange={(e) =>
              setSettings({ ...settings, instagram: e.target.value })
            }
            placeholder='contoh: @drprinting'
          />
        </label>

        <label className='span-2'>
          Alamat Lengkap Workshop / Toko
          <textarea
            rows={3}
            value={settings.address}
            onChange={(e) =>
              setSettings({ ...settings, address: e.target.value })
            }
            placeholder='contoh: Jl. Percetakan Negara No. 45, Jakarta Pusat'
          />
        </label>

        <h2 style={{ marginTop: '16px' }}>Peta & Lokasi (Google Maps)</h2>

        <label className='span-2'>
          <span>Link Google Maps (Buka Lokasi / Petunjuk Arah)</span>
          <input
            value={settings.maps_url || ''}
            onChange={(e) =>
              setSettings({ ...settings, maps_url: e.target.value })
            }
            placeholder='https://maps.app.goo.gl/... atau link Google Maps'
          />
          <span className='cms-helper-text'>
            Tautan ini akan digunakan ketika pengunjung mengklik tombol{' '}
            <strong>"Buka di Google Maps"</strong> untuk navigasi GPS.
          </span>
        </label>

        <label className='span-2'>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>Embed Google Maps (URL atau Kode &lt;iframe&gt;)</span>
            <button
              type='button'
              className='btn btn-ghost btn-sm'
              style={{ padding: '4px 10px', fontSize: '11px' }}
              onClick={handleUseAddressFallback}
              title='Generate URL embed otomatis dari teks alamat di atas'
            >
              📍 Generate dari Alamat
            </button>
          </div>
          <input
            value={settings.maps_embed_url || ''}
            onChange={(e) => handleEmbedChange(e.target.value)}
            placeholder='https://www.google.com/maps/embed?... atau <iframe src="..."></iframe>'
          />
          <span className='cms-helper-text'>
            Buka Google Maps &rarr; cari lokasi workshop &rarr; klik{' '}
            <strong>Bagikan</strong> &rarr; pilih tab{' '}
            <strong>Sematkan peta</strong> &rarr; salin HTML atau URL src
            iframe-nya.
          </span>
        </label>

        {/* Live Preview Peta */}
        <div className='span-2 cms-map-preview-card'>
          <div className='cms-map-preview-header'>
            <span>
              🗺️ Pratinjau Tampilan Peta:{' '}
              {settings.maps_embed_url ? (
                <strong style={{ color: 'var(--success)' }}>
                  (Kustom Embed URL)
                </strong>
              ) : settings.address ? (
                <strong style={{ color: 'var(--blue)' }}>
                  (Fallback Otomatis dari Alamat)
                </strong>
              ) : (
                <span style={{ color: 'var(--muted)' }}>(Belum diatur)</span>
              )}
            </span>
            {previewDirectLink && (
              <a
                href={previewDirectLink}
                target='_blank'
                rel='noopener noreferrer'
                style={{
                  color: 'var(--blue)',
                  fontWeight: 600,
                  fontSize: '12px',
                }}
              >
                Uji Buka di Google Maps ↗
              </a>
            )}
          </div>
          {previewEmbedSrc ? (
            <div className='cms-map-preview-frame'>
              <iframe
                src={previewEmbedSrc}
                title='Pratinjau Peta Google Maps'
                loading='lazy'
                style={{
                  width: '100%',
                  height: '240px',
                  border: 'none',
                  display: 'block',
                }}
              />
            </div>
          ) : (
            <div
              style={{
                padding: '30px',
                textAlign: 'center',
                color: 'var(--muted)',
                fontSize: '13px',
              }}
            >
              Peta belum memiliki sumber embed atau alamat. Masukkan alamat atau
              URL embed di atas untuk melihat pratinjau.
            </div>
          )}
        </div>

        {can('settings.write') && (
          <button
            type='submit'
            className='btn span-2'
            style={{ marginTop: '8px' }}
            disabled={saveSettings.isPending}
          >
            {saveSettings.isPending
              ? 'Menyimpan...'
              : 'Simpan Identitas & Lokasi'}
          </button>
        )}
      </form>

      {/* Form Halaman About */}
      <form
        className='panel form-stack'
        onSubmit={(e) => {
          e.preventDefault()
          savePage.mutate()
        }}
      >
        <h2>Halaman About (Tentang Kami)</h2>
        <label>
          Judul Halaman
          <input
            value={about.title}
            onChange={(e) => setAbout({ ...about, title: e.target.value })}
            required
          />
        </label>
        <div
          style={{
            display: 'grid',
            gap: '7px',
            fontSize: '13px',
            fontWeight: 800,
          }}
        >
          <span>Konten Tentang Kami</span>
          <div style={{ color: '#000', fontWeight: 'normal' }}>
            <CKEditor
              editor={ClassicEditor}
              config={editorConfig}
              data={about.content}
              onChange={(event, editor) => {
                setAbout((prev) => ({ ...prev, content: editor.getData() }))
              }}
            />
          </div>
        </div>
        {can('pages.write') && (
          <button type='submit' className='btn' disabled={savePage.isPending}>
            {savePage.isPending ? 'Menyimpan...' : 'Simpan Halaman About'}
          </button>
        )}
      </form>
    </div>
  )
}
