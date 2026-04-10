import { useState, useEffect } from 'react'
import {
  User, Building, Settings, Bell, Lock,
  Save, Camera, MapPin, Phone, Mail, Globe, CheckCircle2, Upload, AlertTriangle, Database
} from 'lucide-react'
import { settings as settingsApi, auth as authApi } from '../api'

const defaultNotifications = {
  paymentReceived: { email: true, sms: true },
  newProspect: { email: true, sms: false },
  latePayment: { email: true, sms: true },
  interventionReq: { email: true, sms: false },
}

function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profil')
  const [isSaved, setIsSaved] = useState(false)
  const [agencyName, setAgencyName] = useState('ImmoSuite Sénégal')
  const [logoUrl, setLogoUrl] = useState(null)
  const [settingsData, setSettingsData] = useState({})
  const [notifications, setNotifications] = useState(defaultNotifications)
  const [profile, setProfile] = useState({
    firstName: 'Abdoulaye',
    lastName: 'Diop',
    email: 'admin@immosuite.sn',
    phone: '+221 77 123 45 67',
  })

  useEffect(() => {
    settingsApi.get().then(s => {
      setSettingsData(s)
      setAgencyName(s.agencyName || 'ImmoSuite Sénégal')
      setLogoUrl(s.logoUrl || null)
      setNotifications({ ...defaultNotifications, ...(s.notifications || {}) })
      if (s.profile) {
        setProfile(s.profile)
      }
    }).catch(() => {})
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      await settingsApi.update({
        ...settingsData,
        agencyName,
        logoUrl,
        notifications,
        profile,
      })
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 3000)
    } catch (err) {
      console.error(err)
    }
  }

  const handleLogoUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader()
      reader.onloadend = () => setLogoUrl(reader.result)
      reader.readAsDataURL(e.target.files[0])
    }
  }

  const toggleNotificationChannel = (key, channel) => {
    setNotifications(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        [channel]: !prev?.[key]?.[channel],
      },
    }))
  }

  const handleResetClick = async () => {
    const confirmMessage = "Êtes-vous absolument sûr de vouloir réinitialiser l'application ? TOUTES VOS DONNÉES (locataires, biens, paiements, prospects) seront effacées irréversiblement."
    if (window.confirm(confirmMessage)) {
      try {
        await settingsApi.reset()
        window.alert("Le système a été réinitialisé avec succès.")
        window.location.reload()
      } catch (err) {
        console.error(err)
        window.alert("Erreur lors de la réinitialisation du système : " + err.message)
      }
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div><h1>Paramètres</h1><p>Gérez votre compte, votre agence et vos préférences</p></div>
        <button className="btn btn-primary" onClick={handleSave}><Save size={16} /> Enregistrer</button>
      </div>

      {isSaved && (
        <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-xl)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }} className="animate-fade-in-up">
          <CheckCircle2 size={18} /><span style={{ fontWeight: 500 }}>Paramètres mis à jour avec succès.</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-2xl)', alignItems: 'flex-start' }}>
        <div className="card" style={{ width: 250, flexShrink: 0, padding: 'var(--space-sm)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { id: 'profil', label: 'Mon Profil', icon: User },
              { id: 'agence', label: 'Agence Immobilière', icon: Building },
              { id: 'preferences', label: 'Préférences', icon: Settings },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'securite', label: 'Sécurité', icon: Lock },
              { id: 'systeme', label: 'Système', icon: Database },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', width: '100%', padding: '10px var(--space-md)',
                borderRadius: 'var(--radius-sm)', background: activeTab === tab.id ? 'var(--bg-glass-hover)' : 'transparent',
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: activeTab === tab.id ? 600 : 500, transition: 'all var(--transition-fast)'
              }}>
                <tab.icon size={16} style={{ color: activeTab === tab.id ? 'var(--accent-primary)' : 'inherit' }} />{tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <form onSubmit={handleSave}>
            {activeTab === 'profil' && (
              <div className="animate-fade-in">
                <div className="card-header"><div className="card-title">Informations Personnelles</div></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xl)', marginBottom: 'var(--space-2xl)' }}>
                  <div className="avatar" style={{ width: 80, height: 80, fontSize: 32, background: 'linear-gradient(135deg, var(--accent-primary), #8b5cf6)', position: 'relative' }}>
                    {profile.firstName?.[0]}{profile.lastName?.[0]}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 'var(--font-lg)', marginBottom: 4 }}>{profile.firstName} {profile.lastName}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>Administrateur principal</p>
                  </div>
                </div>
                <div className="grid-2">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><label style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>Prénom</label><input type="text" value={profile.firstName} onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))} /></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><label style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>Nom</label><input type="text" value={profile.lastName} onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))} /></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><label style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>Email</label><input type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} /></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><label style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>Téléphone</label><input type="tel" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} /></div>
                </div>
              </div>
            )}

            {activeTab === 'agence' && (
              <div className="animate-fade-in">
                <div className="card-header"><div className="card-title">Détails de l'Agence</div></div>
                <div className="grid-2" style={{ marginBottom: 'var(--space-lg)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>Logo de l'Agence</label>
                    <div style={{ border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)', padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-sm)', background: 'var(--bg-secondary)', position: 'relative' }}>
                      {logoUrl ? (<><img src={logoUrl} alt="Logo" style={{ maxHeight: 120, objectFit: 'contain' }} /><button type="button" className="btn btn-ghost btn-sm" onClick={() => setLogoUrl(null)}>Supprimer</button></>) : (<><div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}><Upload size={24} /></div><div style={{ fontWeight: 600 }}>Cliquez pour uploader</div><input type="file" accept="image/*" onChange={handleLogoUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} /></>)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><label style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>Nom de l'agence</label><input type="text" value={agencyName} onChange={e => setAgencyName(e.target.value)} required /></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><label style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>NINEA</label><input type="text" defaultValue={settingsData.ninea || '001234567 2G3'} /></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, gridColumn: '1 / -1' }}><label style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>Adresse</label><input type="text" defaultValue={settingsData.address || 'Corniche Ouest, Mermoz, Dakar'} /></div>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="animate-fade-in">
                <div className="card-header"><div className="card-title">Préférences Régionales</div></div>
                <div className="grid-2">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><label style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>Devise</label><select defaultValue="XOF"><option value="XOF">Franc CFA (XOF)</option><option value="EUR">Euro (€)</option></select></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><label style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>Langue</label><select defaultValue="FR"><option value="FR">Français</option><option value="EN">Anglais</option></select></div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="animate-fade-in">
                <div className="card-header"><div className="card-title">Notifications</div></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                  {[
                    { key: 'paymentReceived', title: "Paiements reçus", desc: "Alerté quand un locataire paie." },
                    { key: 'newProspect', title: "Nouveaux prospects", desc: "Notification CRM." },
                    { key: 'latePayment', title: "Retards de paiement", desc: "Alertes impayés." },
                    { key: 'interventionReq', title: "Demandes d'intervention", desc: "Signalements travaux." },
                  ].map((notif, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 'var(--space-md)', borderBottom: i !== 3 ? '1px solid var(--border-color)' : 'none' }}>
                      <div><div style={{ fontWeight: 600, marginBottom: 4 }}>{notif.title}</div><div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>{notif.desc}</div></div>
                      <div style={{ display: 'flex', gap: 'var(--space-lg)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--font-sm)', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={!!notifications?.[notif.key]?.email}
                            onChange={() => toggleNotificationChannel(notif.key, 'email')}
                          />
                          Email
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--font-sm)', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={!!notifications?.[notif.key]?.sms}
                            onChange={() => toggleNotificationChannel(notif.key, 'sms')}
                          />
                          SMS
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'securite' && (
              <div className="animate-fade-in">
                <div className="card-header"><div className="card-title">Sécurité du compte</div></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', maxWidth: 400 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><label style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>Mot de passe actuel</label><input type="password" placeholder="••••••••" /></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><label style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>Nouveau mot de passe</label><input type="password" /></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><label style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>Confirmer</label><input type="password" /></div>
                  <button type="button" className="btn btn-ghost" style={{ marginTop: 'var(--space-sm)' }}>Mettre à jour le mot de passe</button>
                </div>
              </div>
            )}

            {activeTab === 'systeme' && (
              <div className="animate-fade-in">
                <div className="card-header"><div className="card-title">Système et Maintenance</div></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
                  
                  <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
                    <h3 style={{ fontSize: 'var(--font-lg)', marginBottom: 12, fontWeight: 600 }}>Informations Logiciel</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: 12, marginBottom: 12 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Mises à jour</span>
                      <span style={{ fontWeight: 600, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle2 size={16} /> Le système est à jour
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: 12, marginBottom: 12 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Version actuelle</span>
                      <span style={{ fontWeight: 600 }}>v1.2.4</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Dernière vérification</span>
                      <span>Aujourd'hui à 08:30</span>
                    </div>
                  </div>

                  <div style={{ border: '1px solid var(--danger)', background: 'rgba(239, 68, 68, 0.05)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, color: 'var(--danger)' }}>
                      <AlertTriangle size={24} />
                      <h3 style={{ fontSize: 'var(--font-lg)', margin: 0, fontWeight: 600 }}>Zone Dangereuse</h3>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)', lineHeight: 1.5 }}>
                      Cette action supprimera <strong>définitivement</strong> tous les locataires, propriétés, paiements, charges, et prospects enregistrés dans le système. Les paramètres de l'agence et votre compte administrateur seront conservés.<br/><br/>
                      <strong style={{ color: 'var(--text-primary)' }}>Cela remettra tous les compteurs à zéro comme si un nouveau locataire/utilisateur venait de créer son compte.</strong>
                    </p>
                    <button type="button" className="btn" style={{ background: 'var(--danger)', color: 'white', border: 'none', fontWeight: 600, padding: '10px 20px', borderRadius: 'var(--radius-md)' }} onClick={handleResetClick}>
                      Réinitialiser l'application
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
