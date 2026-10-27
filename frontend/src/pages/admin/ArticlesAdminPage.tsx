import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, type ApiResult } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { useAdminLoading } from '../../components/admin/AdminLoadingContext'
import type { Article } from '../../types'

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
import 'ckeditor5/ckeditor5.css'

type Form = {
  title: string
  slug: string
  excerpt: string
  content: string
  cover_image_url: string
  status: 'draft' | 'published'
}
const empty: Form = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  cover_image_url: '',
  status: 'draft',
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

export function ArticlesAdminPage() {
  const { accessToken, can } = useAuth()
  const { withAction } = useAdminLoading()
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Article | null>(null)
  const [form, setForm] = useState<Form>(empty)
  const [error, setError] = useState('')
  const q = useQuery({
    queryKey: ['admin-articles'],
    queryFn: () =>
      apiFetch<ApiResult<Article[]>>('/admin/articles', {}, accessToken),
    enabled: !!accessToken,
  })
  const save = useMutation({
    mutationFn: () =>
      editing
        ? apiFetch(
            `/admin/articles/${editing.id}`,
            { method: 'PUT', body: JSON.stringify(form) },
            accessToken,
          )
        : apiFetch(
            '/admin/articles',
            { method: 'POST', body: JSON.stringify(form) },
            accessToken,
          ),
    meta: {
      action: editing
        ? 'Menyimpan perubahan artikel...'
        : 'Menambahkan artikel baru...',
    },
    onSuccess: () => {
      setEditing(null)
      setForm(empty)
      setError('')
      void qc.invalidateQueries({ queryKey: ['admin-articles'] })
    },
    onError: (e) => setError(e.message),
  })
  const del = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/articles/${id}`, { method: 'DELETE' }, accessToken),
    meta: { action: 'Menghapus artikel...' },
    onSuccess: () => {
      setError('')
      void qc.invalidateQueries({ queryKey: ['admin-articles'] })
    },
    onError: (e) => setError(e.message),
  })

  async function uploadCover(file: File) {
    await withAction(async () => {
      setError('')
      const fd = new FormData()
      fd.append('file', file)
      const res = await apiFetch<{ url: string }>(
        '/admin/uploads',
        { method: 'POST', body: fd },
        accessToken,
      )
      setForm((current) => ({ ...current, cover_image_url: res.url }))
    }, 'Mengunggah cover artikel...')
  }
  return (
    <div className='admin-page'>
      <div className='admin-title'>
        <div>
          <span className='eyebrow'>CMS</span>
          <h1>Artikel</h1>
        </div>
      </div>
      {can('articles.write') && (
        <form
          className='panel form-grid'
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate()
          }}
        >
          <h2>{editing ? 'Edit Artikel' : 'Artikel Baru'}</h2>
          <label>
            Judul
            <input
              required
              value={form.title}
              onChange={(e) =>
                setForm({
                  ...form,
                  title: e.target.value,
                  slug: editing
                    ? form.slug
                    : e.target.value
                        .toLowerCase()
                        .trim()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-|-$/g, ''),
                })
              }
            />
          </label>
          <label>
            Slug
            <input
              required
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
            />
          </label>
          <label className='span-2'>
            Excerpt
            <input
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            />
          </label>
          <div
            className='span-2'
            style={{
              display: 'grid',
              gap: '7px',
              fontSize: '13px',
              fontWeight: 800,
            }}
          >
            <span>Isi artikel</span>
            <div style={{ color: '#000', fontWeight: 'normal' }}>
              <CKEditor
                editor={ClassicEditor}
                config={editorConfig}
                data={form.content}
                onChange={(event, editor) => {
                  setForm((prev) => ({ ...prev, content: editor.getData() }))
                }}
              />
            </div>
          </div>
          <label>
            Upload Cover
            <input
              type='file'
              accept='image/png,image/jpeg,image/webp'
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void uploadCover(file)
              }}
            />
          </label>
          <label>
            Cover URL
            <input
              value={form.cover_image_url}
              onChange={(e) =>
                setForm({ ...form, cover_image_url: e.target.value })
              }
            />
          </label>
          <label>
            Status
            <select
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value as 'draft' | 'published',
                })
              }
            >
              <option value='draft'>Draft</option>
              <option value='published'>Published</option>
            </select>
          </label>
          {error && <p className='error span-2'>{error}</p>}
          <div className='form-actions span-2'>
            <button className='btn' disabled={save.isPending}>
              {save.isPending ? 'Menyimpan...' : 'Simpan'}
            </button>
            {editing && (
              <button
                className='btn btn-secondary'
                type='button'
                onClick={() => {
                  setEditing(null)
                  setForm(empty)
                }}
              >
                Batal
              </button>
            )}
          </div>
        </form>
      )}
      <div className='table-wrap'>
        <table>
          <thead>
            <tr>
              <th>Judul</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {q.data?.data.map((a) => (
              <tr key={a.id}>
                <td>
                  <strong>{a.title}</strong>
                  <small>{a.slug}</small>
                </td>
                <td>{a.status}</td>
                <td className='actions'>
                  {can('articles.write') && (
                    <>
                      <button
                        onClick={() => {
                          setEditing(a)
                          setForm({
                            title: a.title,
                            slug: a.slug,
                            excerpt: a.excerpt,
                            content: a.content || '',
                            cover_image_url: a.cover_image_url,
                            status: a.status || 'draft',
                          })
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className='danger-link'
                        onClick={() =>
                          confirm('Hapus artikel?') && del.mutate(a.id)
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
