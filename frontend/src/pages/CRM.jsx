import { useState, useEffect } from 'react'
import {
  Search, Plus, GripVertical, Phone,
  Mail, MessageSquare, Star, MapPin, ArrowRight, UserPlus, FileText, Trash, Edit, MoreHorizontal
} from 'lucide-react'
import { prospects as prospectsApi } from '../api'
import Modal from '../components/Modal'
import Toast from '../components/Toast'

const columns = [
  { id: 'Nouveau', label: 'Nouveau', color: '#3b82f6', next: 'Contact' },
  { id: 'Contact', label: 'Contact', color: '#8b5cf6', next: 'Visite' },
  { id: 'Visite', label: 'Visite', color: '#f59e0b', next: 'Offre' },
  { id: 'Offre', label: 'Offre', color: '#d4a843', next: 'Signé' },
  { id: 'Signé', label: 'Signé', color: '#10b981', action: 'Convertir en Locataire' },
]

function CRM() {
  const [activeTab, setActiveTab] = useState('kanban')
  const [searchTerm, setSearchTerm] = useState('')
  const [prospects, setProspects] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  useEffect(() => {
    prospectsApi.getAll().then(setProspects).catch(err => setToastMessage('Erreur: ' + err.message))
  }, [])

  const handleAddProspect = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    try {
      const created = await prospectsApi.create({
        name: formData.get('name'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        interest: formData.get('interest'),
        source: formData.get('source'),
      })
      setProspects([...prospects, created])
      setIsModalOpen(false)
      setToastMessage(`Le prospect ${created.name} a été ajouté.`)
    } catch (err) {
      setToastMessage('Erreur: ' + err.message)
    }
    setTimeout(() => setToastMessage(''), 3000)
  }
  const handleDeleteProspect = async (id) => {
    if (window.confirm("Voulez-vous vraiment supprimer ce prospect ?")) {
      try {
        await prospectsApi.delete(id)
        setProspects(prospects.filter(p => p.id !== id))
        setToastMessage('Prospect supprimé avec succès.')
      } catch (err) {
        setToastMessage('Erreur: ' + err.message)
      }
      setTimeout(() => setToastMessage(''), 3000)
    }
  }

  const handleEditProspect = (p) => {
    // Alert as a quick mockup, a real edit could reuse the modal
    alert(`Fonctionnalité d'édition à venir pour ${p.name}.`)
  }
  const advanceStatus = async (id, nextStatus) => {
    try {
      const updated = await prospectsApi.advance(id)
      setProspects(prospects.map(p => p.id === id ? updated : p))
    } catch (err) {
      setToastMessage('Erreur: ' + err.message)
    }
  }

  const convertToTenant = async (id, name) => {
    try {
      await prospectsApi.convert(id)
      setProspects(prospects.filter(p => p.id !== id))
      setToastMessage(`${name} a été converti en locataire !`)
    } catch (err) {
      setToastMessage('Erreur: ' + err.message)
    }
    setTimeout(() => setToastMessage(''), 4000)
  }

  const filteredProspects = prospects.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.interest.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div><h1>CRM Immobilier</h1><p>{prospects.length} prospects dans le pipeline</p></div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}><Plus size={16} /> Nouveau prospect</button>
      </div>

      <div className="filter-bar">
        <div className="search-bar"><Search size={16} /><input type="text" placeholder="Rechercher un prospect..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
        <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none' }}>
          <button className={`tab ${activeTab === 'kanban' ? 'active' : ''}`} onClick={() => setActiveTab('kanban')}>Kanban</button>
          <button className={`tab ${activeTab === 'liste' ? 'active' : ''}`} onClick={() => setActiveTab('liste')}>Liste</button>
        </div>
      </div>

      {activeTab === 'kanban' ? (
        <div className="kanban-board">
          {columns.map(col => {
            const colItems = filteredProspects.filter(p => p.status === col.id)
            return (
              <div key={col.id} className="kanban-column">
                <div className="kanban-column-header">
                  <div className="kanban-column-title"><span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />{col.label}</div>
                  <div className="kanban-count">{colItems.length}</div>
                </div>
                <div className="kanban-cards">
                  {colItems.map(item => (
                    <div key={item.id} className="kanban-card animate-fade-in-up">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                          <div className="avatar avatar-sm" style={{ background: `linear-gradient(135deg, ${col.color}, #1f2937)` }}>{item.name.split(' ').map(n => n[0]).join('').substring(0, 2)}</div>
                          <div className="kanban-card-title" style={{ margin: 0 }}>{item.name}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button className="icon-btn btn-sm" onClick={() => handleEditProspect(item)} title="Modifier"><Edit size={13} style={{ color: 'var(--text-muted)' }} /></button>
                          <button className="icon-btn btn-sm" onClick={() => handleDeleteProspect(item.id)} title="Supprimer"><Trash size={13} style={{ color: 'var(--danger)' }} /></button>
                          <GripVertical size={14} style={{ color: 'var(--text-muted)', cursor: 'grab', marginLeft: 4 }} />
                        </div>
                      </div>
                      <div className="kanban-card-meta"><MapPin size={12} /> {item.interest}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-md)', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>{item.source}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#d4a843', fontSize: 'var(--font-xs)', fontWeight: 600 }}><Star size={12} fill="currentColor" /> {item.score}</div>
                      </div>
                      <div style={{ marginTop: 'var(--space-sm)', paddingTop: 'var(--space-sm)', borderTop: '1px dashed var(--border-color)' }}>
                        {col.next ? (
                          <button className="btn btn-ghost btn-sm" style={{ width: '100%', display: 'flex', justifyContent: 'center' }} onClick={() => advanceStatus(item.id, col.next)}>
                            Étape {columns.find(c => c.id === col.next).label} <ArrowRight size={14}/>
                          </button>
                        ) : (
                          <button className="btn btn-primary btn-sm" style={{ width: '100%', display: 'flex', justifyContent: 'center', backgroundColor: '#10b981', color: '#fff', border: 'none' }} onClick={() => convertToTenant(item.id, item.name)}>
                            <UserPlus size={14}/> Basculer en Locataire
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead><tr><th>Prospect</th><th>Intérêt</th><th>Score</th><th>Source</th><th>Statut</th><th>Date</th><th>Contact</th></tr></thead>
            <tbody>
              {filteredProspects.map(prospect => (
                <tr key={prospect.id}>
                  <td style={{ fontWeight: 600 }}>{prospect.name}</td>
                  <td>{prospect.interest}</td>
                  <td style={{ color: 'var(--accent-gold)', fontWeight: 600 }}><div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Star size={12} fill="currentColor" /> {prospect.score}</div></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{prospect.source}</td>
                  <td><span className="badge badge-primary">{prospect.status}</span></td>
                  <td style={{ color: 'var(--text-muted)' }}>{prospect.date}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                      <button className="icon-btn" title={prospect.phone}><Phone size={15} /></button>
                      <button className="icon-btn" title={prospect.email}><Mail size={15} /></button>
                      <button className="icon-btn" title="Note"><MessageSquare size={15} /></button>
                      <button className="icon-btn" title="Modifier" onClick={() => handleEditProspect(prospect)}><Edit size={14} /></button>
                      <button className="icon-btn" title="Supprimer" onClick={() => handleDeleteProspect(prospect.id)}><Trash size={14} style={{ color: 'var(--danger)' }} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nouveau Prospect">
        <form onSubmit={handleAddProspect} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div className="grid-2">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, gridColumn: '1 / -1' }}><label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Nom Complet</label><input type="text" name="name" required placeholder="Ex: Souleymane Kane" /></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Téléphone</label><input type="tel" name="phone" required placeholder="Ex: 77 000 00 00" /></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Email</label><input type="email" name="email" required placeholder="Ex: email@domaine.sn" /></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Bien recherché</label><input type="text" name="interest" required placeholder="Ex: Villa Saly" /></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Source</label><select name="source"><option value="Site web">Site Web</option><option value="Expat-Dakar">Expat-Dakar</option><option value="Jumia House">Jumia House</option><option value="Recommandation">Recommandation</option><option value="Autre">Autre</option></select></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Annuler</button>
            <button type="submit" className="btn btn-primary">Ajouter au CRM</button>
          </div>
        </form>
      </Modal>

      <Toast message={toastMessage} onClose={() => setToastMessage('')} />
    </div>
  )
}

export default CRM
