import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { apiFetch, assetUrl, type ApiResult } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { useAdminLoading } from '../../components/admin/AdminLoadingContext'
import type { Product } from '../../types'

type ProductForm = Omit<Product, 'id'>

const makeEmpty = (): ProductForm => ({
  name: '',
  slug: '',
  category: 'Printing',
  short_description: '',
  description: '',
  price_start: 0,
  image_url: '',
  min_order: 1,
  production_time: '',
  materials: [],
  sizes: [],
  finishing: [],
  features: [],
  gallery_urls: [],
  order_note: '',
  is_featured: false,
  is_published: true,
  sort_order: 0,
})

const lines = (value: string) =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
const asLines = (value?: string[]) => (value ?? []).join('\n')

export function ProductsAdminPage() {
  const { accessToken, can } = useAuth()
  const { withAction } = useAdminLoading()
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductForm>(makeEmpty)
  const [error, setError] = useState('')
  const [uploadingGallery, setUploadingGallery] = useState(false)

  const q = useQuery({
    queryKey: ['admin-products'],
    queryFn: () =>
      apiFetch<ApiResult<Product[]>>('/admin/products', {}, accessToken),
    enabled: !!accessToken,
  })

  const save = useMutation({
    mutationFn: () =>
      editing
        ? apiFetch(
            `/admin/products/${editing.id}`,
            { method: 'PUT', body: JSON.stringify(form) },
            accessToken,
          )
        : apiFetch(
            '/admin/products',
            { method: 'POST', body: JSON.stringify(form) },
            accessToken,
          ),
    meta: {
      action: editing
        ? 'Menyimpan perubahan produk...'
        : 'Menambahkan produk baru...',
    },
    onSuccess: () => {
      setEditing(null)
      setForm(makeEmpty())
      setError('')
      void qc.invalidateQueries({ queryKey: ['admin-products'] })
      void qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (e) => setError(e.message),
  })

  const del = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/products/${id}`, { method: 'DELETE' }, accessToken),
    meta: { action: 'Menghapus produk...' },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-products'] })
      void qc.invalidateQueries({ queryKey: ['products'] })
    },
  })

  const items = useMemo(() => q.data?.data || [], [q.data])

  async function upload(file: File) {
    await withAction(async () => {
      const fd = new FormData()
      fd.append('file', file)
      const res = await apiFetch<{ url: string }>(
        '/admin/uploads',
        { method: 'POST', body: fd },
        accessToken,
      )
      setForm((current) => ({ ...current, image_url: res.url }))
    }, 'Mengunggah gambar utama...')
  }

  async function uploadGallery(files: FileList) {
    await withAction(async () => {
      setUploadingGallery(true)
      setError('')
      try {
        const urls: string[] = []
        for (const file of Array.from(files)) {
          const fd = new FormData()
          fd.append('file', file)
          const res = await apiFetch<{ url: string }>(
            '/admin/uploads',
            { method: 'POST', body: fd },
            accessToken,
          )
          urls.push(res.url)
        }
        setForm((current) => ({
          ...current,
          gallery_urls: [...current.gallery_urls, ...urls],
        }))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload galeri gagal')
      } finally {
        setUploadingGallery(false)
      }
    }, 'Mengunggah galeri gambar...')
  }

  function moveGalleryImage(index: number, direction: -1 | 1) {
    setForm((current) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= current.gallery_urls.length)
        return current
      const gallery = [...current.gallery_urls]
      ;[gallery[index], gallery[nextIndex]] = [
        gallery[nextIndex],
        gallery[index],
      ]
      return { ...current, gallery_urls: gallery }
    })
  }

  function editProduct(product: Product) {
    setEditing(product)
    setForm({
      ...product,
      materials: product.materials ?? [],
      sizes: product.sizes ?? [],
      finishing: product.finishing ?? [],
      features: product.features ?? [],
      gallery_urls: product.gallery_urls ?? [],
    })
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetForm() {
    setEditing(null)
    setForm(makeEmpty())
    setError('')
  }

  return (
    <div className='admin-page'>
      <div className='admin-title'>
        <div>
          <span className='eyebrow'>CMS</span>
          <h1>Produk</h1>
          <p>Kelola katalog dan seluruh konten halaman detail produk.</p>
        </div>
        {can('products.write') && (
          <button className='btn' onClick={resetForm}>
            Produk Baru
          </button>
        )}
      </div>

      {can('products.write') && (
        <form
          className='panel form-grid product-admin-form'
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate()
          }}
        >
          <div className='form-section-title span-2'>
            <span>01</span>
            <div>
              <h2>{editing ? 'Edit Produk' : 'Tambah Produk'}</h2>
              <p>Informasi utama yang tampil di katalog dan halaman detail.</p>
            </div>
          </div>

          <label>
            Nama
            <input
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                  slug: editing
                    ? form.slug
                    : e.target.value
                        .toLowerCase()
                        .trim()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-|-$/g, ''),
                })
              }
              required
            />
          </label>
          <label>
            Slug
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              required
            />
          </label>
          <label>
            Kategori
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </label>
          <label>
            Harga mulai
            <input
              type='number'
              min='0'
              value={form.price_start}
              onChange={(e) =>
                setForm({ ...form, price_start: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Minimum order
            <input
              type='number'
              min='0'
              value={form.min_order}
              onChange={(e) =>
                setForm({ ...form, min_order: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Estimasi produksi
            <input
              placeholder='Contoh: 1-2 hari kerja'
              value={form.production_time}
              onChange={(e) =>
                setForm({ ...form, production_time: e.target.value })
              }
            />
          </label>
          <label className='span-2'>
            Deskripsi singkat
            <input
              maxLength={300}
              value={form.short_description}
              onChange={(e) =>
                setForm({ ...form, short_description: e.target.value })
              }
            />
          </label>
          <label className='span-2'>
            Deskripsi lengkap
            <textarea
              rows={7}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>
          <label className='span-2'>
            Catatan pemesanan
            <textarea
              rows={3}
              placeholder='Contoh: Harga final mengikuti ukuran, bahan, jumlah dan finishing.'
              value={form.order_note}
              onChange={(e) => setForm({ ...form, order_note: e.target.value })}
            />
          </label>

          <div className='form-section-title span-2'>
            <span>02</span>
            <div>
              <h2>Spesifikasi Produk</h2>
              <p>
                Masukkan satu pilihan per baris agar tampil sebagai daftar pada
                halaman detail.
              </p>
            </div>
          </div>
          <label>
            Pilihan bahan
            <textarea
              rows={5}
              placeholder={'Art Carton 260 gsm\nIvory 260 gsm\nLinen'}
              value={asLines(form.materials)}
              onChange={(e) =>
                setForm({ ...form, materials: lines(e.target.value) })
              }
            />
          </label>
          <label>
            Pilihan ukuran
            <textarea
              rows={5}
              placeholder={'9 × 5.5 cm\nA5\nCustom'}
              value={asLines(form.sizes)}
              onChange={(e) =>
                setForm({ ...form, sizes: lines(e.target.value) })
              }
            />
          </label>
          <label>
            Pilihan finishing
            <textarea
              rows={5}
              placeholder={'Laminasi doff\nLaminasi glossy\nRounded corner'}
              value={asLines(form.finishing)}
              onChange={(e) =>
                setForm({ ...form, finishing: lines(e.target.value) })
              }
            />
          </label>
          <label>
            Fitur / keunggulan
            <textarea
              rows={5}
              placeholder={
                'Hasil cetak tajam\nBisa custom desain\nQuality control sebelum produksi'
              }
              value={asLines(form.features)}
              onChange={(e) =>
                setForm({ ...form, features: lines(e.target.value) })
              }
            />
          </label>

          <div className='form-section-title span-2'>
            <span>03</span>
            <div>
              <h2>Media Produk</h2>
              <p>
                Gambar utama menjadi slide pertama. Galeri tampil sebagai
                slider/carousel dan bisa berisi banyak gambar.
              </p>
            </div>
          </div>
          <label>
            Upload gambar utama
            <input
              type='file'
              accept='image/png,image/jpeg,image/webp'
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void upload(file)
              }}
            />
          </label>
          <label>
            URL gambar utama
            <input
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            />
          </label>
          {form.image_url && (
            <div className='media-preview'>
              <span>Preview utama</span>
              <img
                className='admin-thumb admin-thumb-lg'
                src={assetUrl(form.image_url)}
                alt='preview produk'
              />
            </div>
          )}
          <label>
            Upload galeri
            <input
              type='file'
              multiple
              accept='image/png,image/jpeg,image/webp'
              disabled={uploadingGallery}
              onChange={(e) => {
                if (e.target.files?.length) void uploadGallery(e.target.files)
              }}
            />
            <small>
              {uploadingGallery
                ? 'Sedang mengupload...'
                : 'Bisa memilih beberapa gambar sekaligus.'}
            </small>
          </label>
          <label className='span-2'>
            URL galeri — satu per baris
            <textarea
              rows={4}
              value={asLines(form.gallery_urls)}
              onChange={(e) =>
                setForm({ ...form, gallery_urls: lines(e.target.value) })
              }
            />
          </label>
          {!!form.gallery_urls.length && (
            <div className='admin-gallery span-2'>
              {form.gallery_urls.map((url, index) => (
                <div key={`${url}-${index}`}>
                  <img src={assetUrl(url)} alt={`Galeri ${index + 1}`} />
                  <span className='admin-gallery-order'>Slide {index + 2}</span>
                  <div className='admin-gallery-actions'>
                    <button
                      type='button'
                      disabled={index === 0}
                      onClick={() => moveGalleryImage(index, -1)}
                      aria-label='Geser gambar ke kiri'
                    >
                      ←
                    </button>
                    <button
                      type='button'
                      disabled={index === form.gallery_urls.length - 1}
                      onClick={() => moveGalleryImage(index, 1)}
                      aria-label='Geser gambar ke kanan'
                    >
                      →
                    </button>
                    <button
                      className='gallery-delete'
                      type='button'
                      onClick={() =>
                        setForm({
                          ...form,
                          gallery_urls: form.gallery_urls.filter(
                            (_, i) => i !== index,
                          ),
                        })
                      }
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className='form-section-title span-2'>
            <span>04</span>
            <div>
              <h2>Publikasi</h2>
              <p>Atur posisi produk serta visibilitas di website publik.</p>
            </div>
          </div>
          <label>
            Urutan
            <input
              type='number'
              value={form.sort_order}
              onChange={(e) =>
                setForm({ ...form, sort_order: Number(e.target.value) })
              }
            />
          </label>
          <div className='publish-checks'>
            <label className='check'>
              <input
                type='checkbox'
                checked={form.is_featured}
                onChange={(e) =>
                  setForm({ ...form, is_featured: e.target.checked })
                }
              />{' '}
              Featured
            </label>
            <label className='check'>
              <input
                type='checkbox'
                checked={form.is_published}
                onChange={(e) =>
                  setForm({ ...form, is_published: e.target.checked })
                }
              />{' '}
              Published
            </label>
          </div>

          <div className='form-actions span-2'>
            <button
              className='btn'
              disabled={save.isPending || uploadingGallery}
            >
              {save.isPending ? 'Menyimpan...' : 'Simpan Produk'}
            </button>
            {editing && (
              <button
                type='button'
                className='btn btn-secondary'
                onClick={resetForm}
              >
                Batal
              </button>
            )}
            {editing?.is_published && (
              <Link
                className='btn btn-secondary'
                target='_blank'
                to={`/produk/${editing.slug}`}
              >
                Preview Detail ↗
              </Link>
            )}
          </div>
          {error && <p className='error span-2'>{error}</p>}
        </form>
      )}

      <div className='table-wrap'>
        <table>
          <thead>
            <tr>
              <th>Produk</th>
              <th>Kategori</th>
              <th>Harga</th>
              <th>Detail</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td>
                  <strong>{p.name}</strong>
                  <small>{p.slug}</small>
                </td>
                <td>{p.category}</td>
                <td>Rp {p.price_start.toLocaleString('id-ID')}</td>
                <td>
                  <small>
                    Min. {p.min_order || '-'} ·{' '}
                    {p.production_time || 'Estimasi belum diisi'}
                  </small>
                  <small>{p.gallery_urls?.length ?? 0} gambar galeri</small>
                </td>
                <td>{p.is_published ? 'Published' : 'Draft'}</td>
                <td className='actions'>
                  {p.is_published && (
                    <Link target='_blank' to={`/produk/${p.slug}`}>
                      Lihat
                    </Link>
                  )}
                  {can('products.write') && (
                    <>
                      <button onClick={() => editProduct(p)}>Edit</button>
                      <button
                        className='danger-link'
                        onClick={() =>
                          confirm('Hapus produk?') && del.mutate(p.id)
                        }
                      >
                        Hapus
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
