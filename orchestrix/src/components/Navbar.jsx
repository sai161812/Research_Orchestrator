import { Link, useLocation } from 'react-router-dom'

const links = [
  { path: '/', label: 'Research' },
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/sessions', label: 'Sessions' },
]

export default function Navbar() {
  const { pathname } = useLocation()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(4,4,10,0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid #1e1e35'
      }}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 14, color: 'white'
          }}>O</div>
          <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 18, letterSpacing: '-0.02em' }}>
            Orchestrix
          </span>
          <span style={{
            fontSize: 11, color: '#6366f1', background: '#6366f115',
            border: '1px solid #6366f130', padding: '2px 8px', borderRadius: 20
          }}>
            Multi-Agent
          </span>
        </div>

        {/* Nav Links */}
        <div className="flex items-center gap-1">
          {links.map(link => (
            <Link key={link.path} to={link.path} style={{
              padding: '6px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500,
              textDecoration: 'none', transition: 'all 0.2s',
              color: pathname === link.path ? '#a5b4fc' : '#94a3b8',
              background: pathname === link.path ? '#6366f115' : 'transparent',
              border: pathname === link.path ? '1px solid #6366f130' : '1px solid transparent'
            }}>
              {link.label}
            </Link>
          ))}
        </div>

      </div>
    </nav>
  )
}