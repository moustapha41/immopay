import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Mail, Lock, Loader2 } from 'lucide-react'
import { auth, setToken } from '../api'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@immosuite.sn')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const data = await auth.login(email, password)
      setToken(data.token)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Identifiants invalides.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="page-container" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      padding: 'var(--space-lg)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64, height: 64,
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, var(--accent-gold), #d97706)',
            marginBottom: 16,
            boxShadow: '0 4px 14px var(--accent-gold-glow)',
          }}>
            <Building2 size={32} color="#fff" />
          </div>
          <h1 style={{
            fontSize: 'var(--font-2xl)',
            fontWeight: 800,
            color: 'var(--text-primary)',
            marginBottom: 4,
          }}>ImmoSuite</h1>
          <p style={{
            color: 'var(--text-muted)',
            fontSize: 'var(--font-sm)',
          }}>Plateforme de gestion immobilière</p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 'var(--space-xl)' }}>
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <h2 style={{
              fontSize: 'var(--font-lg)',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: 4,
            }}>Connexion</h2>
            <p style={{
              color: 'var(--text-muted)',
              fontSize: 'var(--font-sm)',
            }}>Accédez à votre espace de gestion</p>
          </div>

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: 'var(--space-lg)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Mail size={14} /> Email
              </label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@immosuite.sn"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Lock size={14} /> Mot de passe
              </label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
              style={{
                width: '100%',
                marginTop: 'var(--space-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>

        <p style={{
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: 'var(--font-xs)',
          marginTop: 'var(--space-lg)',
        }}>
          © 2026 ImmoSuite — Sénégal
        </p>
      </div>
    </div>
  )
}
