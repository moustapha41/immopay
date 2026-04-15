import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Building2, Sparkles } from 'lucide-react'
import avatarImg from '../assets/medoune_seck.png'

export default function Welcome() {
  const navigate = useNavigate()
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [particles, setParticles] = useState([])

  // Init particles
  useEffect(() => {
    const newParticles = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 5
    }))
    setParticles(newParticles)
  }, [])

  // Handle Mouse Move for tilt effect
  const handleMouseMove = (e) => {
    const { clientX, clientY } = e
    const { innerWidth, innerHeight } = window
    const x = (clientX / innerWidth - 0.5) * 20 // Max 10deg
    const y = (clientY / innerHeight - 0.5) * -20
    setTilt({ x, y })
  }

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 })
  }

  return (
    <div 
      className="welcome-screen"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background with Particles */}
      <div className="welcome-background">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
        
        {particles.map(p => (
          <div 
            key={p.id}
            className="particle"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`
            }}
          />
        ))}
      </div>

      <div className="welcome-content">
        <div 
          className="welcome-card animate-fade-in-up"
          style={{
            transform: `perspective(1000px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
            transition: tilt.x === 0 ? 'transform 0.5s ease' : 'none'
          }}
        >
          {/* Logo Section */}
          <div className="welcome-logo-container">
            <div className="logo-glow"></div>
            <div className="logo-box animate-bounce-slow">
              <Building2 size={32} />
            </div>
            <h1 className="brand-text">ImmoSuite</h1>
          </div>

          {/* Avatar Section */}
          <div className="avatar-wrapper">
            <div className="avatar-ring animate-rotate-slow"></div>
            <div className="avatar-container animate-breath">
              <img src={avatarImg} alt="Medoune Seck" className="welcome-avatar" />
            </div>
            <div className="status-badge pulse-badge">
              <Sparkles size={12} fill="currentColor" />
              <span>En ligne</span>
            </div>
          </div>

          {/* Greeting Section */}
          <div className="greeting-text">
            <h2 className="greeting-title typing-animation">
              Bienvenue, <span className="highlight">Medoune Seck</span>
            </h2>
            <p className="greeting-subtitle fade-in-delay">
              Dans votre <span className="space-text">Espace Immo</span> premium
            </p>
          </div>

          {/* Action Section */}
          <button 
            onClick={() => navigate('/login')}
            className="enter-button animate-shimmer"
          >
            <span>Accéder à la plateforme</span>
            <div className="icon-circle">
              <ArrowRight size={20} />
            </div>
          </button>

          <p className="welcome-footer">
            Gestion immobilière de luxe au Sénégal
          </p>
        </div>
      </div>
    </div>
  )
}
