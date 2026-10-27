import { NavLink, Outlet } from 'react-router-dom'
import { PublicLoadingProvider } from '../components/public/PublicLoadingContext'
import { PublicGlobalLoader } from '../components/public/PublicGlobalLoader'
import { VisitorTracker } from '../components/public/VisitorTracker'

const links = [
  ['/', 'Home'],
  ['/produk', 'Produk'],
  ['/artikel', 'Artikel'],
  ['/review', 'Review'],
  ['/about', 'About'],
]

function PublicShell() {
  return (
    <>
      <VisitorTracker />
      <PublicGlobalLoader />
      <header className='site-header'>
        <div className='container nav-wrap'>
          <NavLink to='/' className='brand'>
            <span className='brand-mark'>DR</span>
            <span>DR Printing</span>
          </NavLink>
          <nav className='public-nav'>
            {links.map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <NavLink className='btn btn-sm' to='/produk'>
            Pesan Cetak
          </NavLink>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className='footer'>
        <div className='container footer-grid'>
          <div>
            <div className='brand light'>
              <span className='brand-mark'>DR</span>
              <span>DR Printing</span>
            </div>
            <p>
              Partner printing untuk bisnis, event, promosi, dan kebutuhan
              harian.
            </p>
          </div>
          <div>
            <strong>Menu</strong>
            <p>Produk · Artikel · Review · About</p>
          </div>
          {/* <div>
            <strong>CMS</strong>
            <p>
              <NavLink to='/cms/login'>Login Admin</NavLink>
            </p>
          </div> */}
        </div>
      </footer>
    </>
  )
}

export function PublicLayout() {
  return (
    <PublicLoadingProvider>
      <PublicShell />
    </PublicLoadingProvider>
  )
}
