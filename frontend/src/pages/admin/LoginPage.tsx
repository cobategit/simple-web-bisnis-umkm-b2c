import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

export function LoginPage() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('admin@printku.local')
  const [password, setPassword] = useState('Admin123!change')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const sessionExpired = Boolean(location.state?.sessionExpired)

  if (user) return <Navigate to='/cms' replace />

  return (
    <div className='login-page'>
      <form
        className='login-card'
        onSubmit={async (e) => {
          e.preventDefault()
          setLoading(true)
          setError('')
          try {
            await login(email, password)
            navigate('/cms')
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Login gagal')
          } finally {
            setLoading(false)
          }
        }}
      >
        <div className='brand'>
          <span className='brand-mark'>P</span>
          <span>PrintKu CMS</span>
        </div>
        <h1>Login CMS</h1>
        <p>Kelola produk, artikel, review, konten, dan user.</p>

        {sessionExpired && !error && (
          <div
            style={{
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              color: '#be123c',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>⚠️ Sesi Anda telah berakhir. Silakan login kembali.</span>
          </div>
        )}

        <label>
          Email
          <input
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <button className='btn' disabled={loading}>
          {loading ? 'Memproses...' : 'Login'}
        </button>
        {error && <p className='error'>{error}</p>}
        <small>
          Credential default hanya untuk development. Ganti password setelah
          seed.
        </small>
      </form>
    </div>
  )
}
