import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { clearToken, notifications as notificationsApi, settings as settingsApi } from '../api'
import {
  LayoutDashboard, Building2, Users, Receipt, Contact,
  CreditCard, Bell, Search, Settings, Sun, Moon, LogOut
} from 'lucide-react'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/biens', label: 'Biens', icon: Building2 },
  { path: '/locataires', label: 'Locataires', icon: Contact },
  { path: '/crm', label: 'CRM', icon: Users },
  { path: '/charges', label: 'Charges', icon: Receipt },
  { path: '/paiements', label: 'Paiements', icon: CreditCard },
]

function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [notifOpen, setNotifOpen] = useState(false)
  const [items, setItems] = useState([])
  
  const handleLogout = () => {
    clearToken()
    navigate('/login')
  }
  
  // Theme state
  const [theme, setTheme] = useState('light')
  const [userProfile, setUserProfile] = useState({ firstName: 'A', lastName: 'D' })

  useEffect(() => {
    // Charger le profil utilisateur
    settingsApi.get().then(s => {
      if (s?.profile) {
        setUserProfile(s.profile)
      }
    }).catch(() => {})
  }, [location.pathname])
  
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  useEffect(() => {
    async function loadNotifications() {
      try {
        const data = await notificationsApi.getAll()
        setItems(data)
      } catch (_) {
        setItems([])
      }
    }
    loadNotifications()
  }, [location.pathname])

  const unreadCount = items.filter(n => !n.readAt && n.channel === 'in_app').length

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead()
      setItems(prev => prev.map(n => ({ ...n, readAt: n.readAt || new Date().toISOString() })))
    } catch (_) {}
  }

  const handleReadOne = async (id) => {
    try {
      await notificationsApi.markAsRead(id)
      setItems(prev => prev.map(n => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)))
    } catch (_) {}
  }

  return (
    <>
      <nav className="navbar" id="main-navbar">
        <div className="navbar-logo">
          <div className="logo-icon">
            <Building2 size={18} />
          </div>
          <span>ImmoSuite</span>
        </div>

        <div className="navbar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="navbar-actions">
          <button className="icon-btn" onClick={toggleTheme} title="Changer le thème">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button className="icon-btn" id="btn-notifications" title="Notifications" onClick={() => setNotifOpen(prev => !prev)}>
            <Bell size={18} />
            {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
          </button>
          {notifOpen && (
            <div style={{
              position: 'absolute',
              top: 62,
              right: 120,
              width: 360,
              maxHeight: 420,
              overflowY: 'auto',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              zIndex: 20,
              boxShadow: '0 20px 45px rgba(0,0,0,0.15)',
              padding: 'var(--space-sm)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px var(--space-sm)' }}>
                <strong>Notifications</strong>
                <button className="btn btn-ghost btn-sm" onClick={handleMarkAllRead}>Tout lire</button>
              </div>
              {items.filter(n => n.channel === 'in_app').length === 0 ? (
                <div style={{ color: 'var(--text-muted)', padding: 'var(--space-md)' }}>Aucune notification.</div>
              ) : (
                items.filter(n => n.channel === 'in_app').map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleReadOne(n.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      border: 'none',
                      background: n.readAt ? 'transparent' : 'rgba(59,130,246,0.08)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px var(--space-sm)',
                      cursor: 'pointer',
                      marginBottom: 4,
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>{n.title}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-xs)' }}>{n.message}</div>
                  </button>
                ))
              )}
            </div>
          )}
          <NavLink to="/parametres" className={({isActive}) => `icon-btn ${isActive ? 'text-primary' : ''}`} title="Paramètres">
            <Settings size={18} />
          </NavLink>
          <div className="navbar-avatar" id="user-avatar" title="Mon compte">
            {userProfile.firstName?.[0]}{userProfile.lastName?.[0]}
          </div>
          <button className="icon-btn" onClick={handleLogout} title="Déconnexion" style={{ color: 'var(--danger)' }}>
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      <main className="main-content">
        <Outlet />
      </main>
    </>
  )
}

export default Layout
