import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import {
  AdminLoadingProvider,
  useAdminLoading,
} from '../components/admin/AdminLoadingContext'
import { AdminGlobalLoader } from '../components/admin/AdminGlobalLoader'

const menu: Array<[string, string, string?]> = [
  ['/cms', 'Dashboard', 'dashboard.read'],
  ['/cms/produk', 'Produk', 'products.read'],
  ['/cms/artikel', 'Artikel', 'articles.read'],
  ['/cms/review', 'Review', 'reviews.read'],
  ['/cms/konten', 'Konten & About', 'pages.read'],
  ['/cms/users', 'User & Role', 'users.read'],
]

function AdminShell() {
  const { user, can, logout } = useAuth()
  const { withAction } = useAdminLoading()
  const navigate = useNavigate()

  async function handleLogout() {
    await withAction(async () => {
      await logout()
      navigate('/cms/login')
    }, 'Sedang keluar akun...')
  }

  return (
    <div className='admin-shell'>
      <AdminGlobalLoader />
      <aside className='sidebar'>
        <NavLink to='/' className='brand light'>
          <span className='brand-mark'>DR</span>
          <span>DR Printing CMS</span>
        </NavLink>
        <div className='sidebar-user'>
          <small>Login sebagai</small>
          <strong>{user?.name}</strong>
          <span>{user?.roles.join(', ')}</span>
        </div>
        <nav>
          {menu
            .filter(([, , p]) => !p || can(p))
            .map(([to, label]) => (
              <NavLink key={to} end={to === '/cms'} to={to}>
                {label}
              </NavLink>
            ))}
        </nav>
        <button className='btn btn-ghost' onClick={handleLogout}>
          Logout
        </button>
      </aside>
      <section className='admin-main'>
        <Outlet />
      </section>
    </div>
  )
}

export function AdminLayout() {
  return (
    <AdminLoadingProvider>
      <AdminShell />
    </AdminLoadingProvider>
  )
}
