import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, type ApiResult } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
type User = {
  id: string
  name: string
  email: string
  is_active: boolean
  roles: string[]
}
export function UsersAdminPage() {
  const { accessToken, can } = useAuth()
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'editor',
  })
  const [error, setError] = useState('')
  const q = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => apiFetch<ApiResult<User[]>>('/admin/users', {}, accessToken),
    enabled: !!accessToken,
  })
  const create = useMutation({
    mutationFn: () =>
      apiFetch(
        '/admin/users',
        { method: 'POST', body: JSON.stringify(form) },
        accessToken,
      ),
    meta: { action: 'Membuat user baru...' },
    onSuccess: () => {
      setForm({ name: '', email: '', password: '', role: 'editor' })
      setError('')
      void qc.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (e) => setError(e.message),
  })
  const update = useMutation({
    mutationFn: ({ u, role }: { u: User; role: string }) =>
      apiFetch(
        `/admin/users/${u.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({ name: u.name, role, is_active: !u.is_active }),
        },
        accessToken,
      ),
    meta: { action: 'Memperbarui status user...' },
    onSuccess: () => {
      setError('')
      void qc.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (e) => setError(e.message),
  })
  return (
    <div className='admin-page'>
      <div className='admin-title'>
        <div>
          <span className='eyebrow'>RBAC</span>
          <h1>User & Role</h1>
          <p>Superadmin dapat membuat user dan menentukan role.</p>
        </div>
      </div>
      {can('users.write') && (
        <form
          className='panel form-grid'
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate()
          }}
        >
          <h2>User Baru</h2>
          <label>
            Nama
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            Email
            <input
              required
              type='email'
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label>
            Password
            <input
              required
              type='password'
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>
          <label>
            Role
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value='editor'>Editor</option>
              <option value='admin'>Admin</option>
              <option value='superadmin'>Superadmin</option>
            </select>
          </label>
          {error && <p className='error span-2'>{error}</p>}
          <button className='btn span-2' disabled={create.isPending}>
            {create.isPending ? 'Membuat...' : 'Buat User'}
          </button>
        </form>
      )}
      <div className='table-wrap'>
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {q.data?.data.map((u) => (
              <tr key={u.id}>
                <td>
                  <strong>{u.name}</strong>
                  <small>{u.email}</small>
                </td>
                <td>{u.roles.filter(Boolean).join(', ')}</td>
                <td>{u.is_active ? 'Aktif' : 'Nonaktif'}</td>
                <td>
                  {can('users.write') && (
                    <button
                      disabled={update.isPending}
                      onClick={() =>
                        update.mutate({ u, role: u.roles[0] || 'editor' })
                      }
                    >
                      {u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
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
