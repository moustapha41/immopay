import { useState, useEffect } from 'react'
import {
  Search, Plus, Eye, MapPin, Calendar, CreditCard,
  FileText, Link, BanknoteIcon, UserCheck, ShieldCheck, Mail, Phone, Home, Trash, Edit
} from 'lucide-react'
import { tenants as tenantsApi, payments as paymentsApi, properties as propertiesApi } from '../api'
import Modal from '../components/Modal'
import Toast from '../components/Toast'

function formatFCFA(amount) {
  return (amount || 0).toLocaleString('fr-FR') + ' FCFA'
}

export default function Tenants() {
  const [searchTerm, setSearchTerm] = useState('')
  const [localTenants, setLocalTenants] = useState([])
  const [localPayments, setLocalPayments] = useState([])
  const [allProperties, setAllProperties] = useState([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState(null)
  const [editingTenant, setEditingTenant] = useState(null)
  const [toastMessage, setToastMessage] = useState('')
  const [addFormRent, setAddFormRent] = useState('')
  const [addFormDate, setAddFormDate] = useState(new Date().toISOString().split('T')[0])
  const [confirmPaymentModal, setConfirmPaymentModal] = useState(false)
  const [newlyCreatedTenant, setNewlyCreatedTenant] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [t, p, props] = await Promise.all([
          tenantsApi.getAll(),
          paymentsApi.getAll(),
          propertiesApi.getAll(),
        ])
        setLocalTenants(t)
        setLocalPayments(p)
        setAllProperties(props)
      } catch (err) {
        setToastMessage('Erreur: ' + err.message)
      }
    }
    load()
  }, [])

  const handleCopyLink = (token) => {
    const url = `${window.location.origin}/locataire/${token}`
    navigator.clipboard.writeText(url)
    setToastMessage(`Lien du portail copié : ${url}`)
    setTimeout(() => setToastMessage(''), 4000)
  }

  const handleAddTenant = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    try {
      const created = await tenantsApi.create({
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        propertyId: parseInt(formData.get('propertyId')),
        rent: parseInt(formData.get('rent')),
        depositAmount: parseInt(formData.get('depositAmount')),
        dateEntree: formData.get('dateEntree'),
      })
      setLocalTenants([created, ...localTenants])
      setIsAddModalOpen(false)
      setNewlyCreatedTenant(created)
      setConfirmPaymentModal(true)
      setToastMessage(`Le locataire ${created.firstName} a été ajouté.`)
    } catch (err) {
      setToastMessage('Erreur: ' + err.message)
    }
    setTimeout(() => setToastMessage(''), 4000)
  }

  const handleConfirmFirstPayment = async (isPaid) => {
    if (!newlyCreatedTenant) return
    
    try {
      if (isPaid) {
        // Créer un paiement payé
        await paymentsApi.create({
          tenantId: newlyCreatedTenant.id,
          tenantName: `${newlyCreatedTenant.firstName} ${newlyCreatedTenant.lastName}`,
          propertyId: newlyCreatedTenant.propertyId,
          propertyName: newlyCreatedTenant.propertyName || '',
          amount: newlyCreatedTenant.rent,
          date: newlyCreatedTenant.dateEntree || new Date().toISOString().split('T')[0],
          status: 'Payé',
          method: 'Espèces',
          period: new Date().toISOString().slice(0, 7),
        })
        setToastMessage(`Loyer de ${newlyCreatedTenant.firstName} marqué comme encaissé.`)
      } else {
        // Créer un paiement impayé
        await paymentsApi.create({
          tenantId: newlyCreatedTenant.id,
          tenantName: `${newlyCreatedTenant.firstName} ${newlyCreatedTenant.lastName}`,
          propertyId: newlyCreatedTenant.propertyId,
          propertyName: newlyCreatedTenant.propertyName || '',
          amount: newlyCreatedTenant.rent,
          date: newlyCreatedTenant.dateEntree || new Date().toISOString().split('T')[0],
          status: 'En retard',
          method: '-',
          period: new Date().toISOString().slice(0, 7),
        })
        setToastMessage(`Loyer de ${newlyCreatedTenant.firstName} marqué comme impayé.`)
      }
      // Recharger les paiements
      const updatedPayments = await paymentsApi.getAll()
      setLocalPayments(updatedPayments)
    } catch (err) {
      setToastMessage('Erreur: ' + err.message)
    }
    setConfirmPaymentModal(false)
    setNewlyCreatedTenant(null)
    setTimeout(() => setToastMessage(''), 4000)
  }

  const handleSettle = async (tenantId, tenantName) => {
    try {
      await tenantsApi.settle(tenantId)
      setLocalPayments(prev => prev.map(p => {
        if (p.tenantId === tenantId && p.status === 'En retard') {
          return { ...p, status: 'Payé', method: 'Espèces' }
        }
        return p
      }))
      setToastMessage(`Paiement enregistré pour ${tenantName}.`)
    } catch (err) {
      setToastMessage('Erreur: ' + err.message)
    }
    setTimeout(() => setToastMessage(''), 3000)
  }

  const handlePropertyChange = (e) => {
    const propId = parseInt(e.target.value)
    const prop = allProperties.find(p => p.id === propId)
    if (prop && prop.price) {
      setAddFormRent(prop.price)
    } else {
      setAddFormRent('')
    }
  }

  const handleDeleteTenant = async (id) => {
    if (window.confirm("Voulez-vous vraiment supprimer ce locataire ?")) {
      try {
        await tenantsApi.remove(id)
        setLocalTenants(localTenants.filter(t => t.id !== id))
        setToastMessage('Locataire supprimé avec succès.')
      } catch (err) {
        setToastMessage('Erreur: ' + err.message)
      }
      setTimeout(() => setToastMessage(''), 3000)
    }
  }

  const handleEditTenant = (t) => {
    setEditingTenant(t)
    setIsEditModalOpen(true)
  }

  const handleUpdateTenant = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    try {
      const updated = await tenantsApi.update(editingTenant.id, {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        rent: parseInt(formData.get('rent')),
        depositAmount: parseInt(formData.get('depositAmount')),
      })
      setLocalTenants(prev => prev.map(t => t.id === updated.id ? updated : t))
      setIsEditModalOpen(false)
      setEditingTenant(null)
      setToastMessage(`Locataire ${updated.firstName} ${updated.lastName} mis à jour.`)
    } catch (err) {
      setToastMessage('Erreur: ' + err.message)
    }
    setTimeout(() => setToastMessage(''), 4000)
  }

  const filtered = localTenants.filter(t =>
    t.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.propertyName || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const activeTenants = localTenants.filter(t => t.status === 'Actif').length

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div><h1>Locataires</h1><p>Gestion des baux, accès portail et règlements</p></div>
        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}><Plus size={16} /> Nouveau locataire</button>
      </div>

      <div className="stats-grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="stat-card"><div className="stat-card-icon blue"><UserCheck size={22} /></div><div className="stat-card-value">{activeTenants}</div><div className="stat-card-label">Locataires actifs</div></div>
        <div className="stat-card"><div className="stat-card-icon purple"><CreditCard size={22} /></div><div className="stat-card-value">{formatFCFA(localTenants.reduce((s, t) => s + (t.rent || 0), 0))}</div><div className="stat-card-label">Loyers mensuels (total)</div></div>
        <div className="stat-card"><div className="stat-card-icon gold"><ShieldCheck size={22} /></div><div className="stat-card-value">{formatFCFA(localTenants.reduce((s, t) => s + (t.depositAmount || 0), 0))}</div><div className="stat-card-label">Caution / Dépôt de garantie</div></div>
      </div>

      <div className="filter-bar">
        <div className="search-bar"><Search size={16} /><input type="text" placeholder="Rechercher un locataire ou un bien..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
      </div>

      <div className="card">
        <table className="data-table">
          <thead><tr><th>Locataire</th><th>Bien assigné</th><th>Loyer</th><th>Dépôt</th><th>Solde</th><th>Statut</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
          <tbody>
            {filtered.map(tenant => {
              const tenantPayments = localPayments.filter(p => p.tenantId === tenant.id)
              const unpaidCount = tenantPayments.filter(p => p.status === 'En retard').length
              return (
                <tr key={tenant.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <div className="avatar avatar-sm" style={{ background: 'linear-gradient(135deg, #3b82f6, #ec4899)' }}>{tenant.firstName[0]}{tenant.lastName[0]}</div>
                      <div><div style={{ fontWeight: 600 }}>{tenant.firstName} {tenant.lastName}</div><div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>{tenant.token}</div></div>
                    </div>
                  </td>
                  <td><div style={{ fontSize: 'var(--font-sm)', display: 'flex', alignItems: 'center', gap: 4 }}><Home size={12} /> {tenant.propertyName}</div></td>
                  <td style={{ fontWeight: 600 }}>{formatFCFA(tenant.rent)}</td>
                  <td><span className="badge badge-primary">{formatFCFA(tenant.depositAmount)}</span></td>
                  <td>{unpaidCount > 0 ? <span className="badge badge-dot badge-danger">Impayé</span> : <span className="badge badge-dot badge-success">À jour</span>}</td>
                  <td><span className="badge badge-success">{tenant.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--space-xs)', justifyContent: 'flex-end' }}>
                      {unpaidCount > 0 && <button className="btn btn-primary btn-sm" onClick={() => handleSettle(tenant.id, tenant.firstName)}><BanknoteIcon size={14} style={{ marginRight: 4 }} /> Régler</button>}
                      <button className="icon-btn" title="Copier le lien" onClick={() => handleCopyLink(tenant.token)}><Link size={15} /></button>
                      <button className="icon-btn" title="Voir la fiche" onClick={() => setSelectedTenant(tenant)}><Eye size={15} /></button>
                      <button className="icon-btn" title="Modifier" onClick={() => handleEditTenant(tenant)}><Edit size={15} /></button>
                      <button className="icon-btn" title="Supprimer" onClick={() => handleDeleteTenant(tenant.id)}><Trash size={15} style={{ color: 'var(--danger)' }} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal isOpen={!!selectedTenant} onClose={() => setSelectedTenant(null)} title="Fiche Locataire">
        {selectedTenant && (() => {
          const history = localPayments.filter(p => p.tenantId === selectedTenant.id)
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <div className="avatar" style={{ width: 64, height: 64, fontSize: 24, background: 'linear-gradient(135deg, #1e3a5f, #3b82f6)' }}>{selectedTenant.firstName[0]}{selectedTenant.lastName[0]}</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 'var(--font-lg)', color: 'var(--text-primary)' }}>{selectedTenant.firstName} {selectedTenant.lastName}</h3>
                  <div style={{ color: 'var(--text-secondary)', display: 'flex', gap: 'var(--space-sm)', fontSize: 'var(--font-sm)', marginTop: 4 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={14}/> {selectedTenant.phone}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={14}/> {selectedTenant.email}</span>
                  </div>
                </div>
              </div>
              <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div style={{ padding: 'var(--space-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Bien</div>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><Home size={14} color="var(--accent-primary)"/> {selectedTenant.propertyName}</div>
                  <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>Bail: {selectedTenant.bailNumber}</div>
                </div>
                <div style={{ padding: 'var(--space-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Finances</div>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><BanknoteIcon size={14} color="var(--accent-gold)"/> Loyer : {formatFCFA(selectedTenant.rent)}</div>
                  <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>Caution : {formatFCFA(selectedTenant.depositAmount)}</div>
                </div>
              </div>
              <div style={{ background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.2)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><div style={{ fontWeight: 600, marginBottom: 2 }}>Portail Locataire</div><div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>Token : <strong style={{ color: 'var(--accent-gold)' }}>{selectedTenant.token}</strong></div></div>
                <button className="btn btn-ghost btn-sm" onClick={() => handleCopyLink(selectedTenant.token)}><Link size={14}/> Copier URL</button>
              </div>
              <div>
                <h4 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>Historique des paiements</h4>
                {history.length > 0 ? (
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    {history.map((p, i) => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-sm) var(--space-md)', borderBottom: i < history.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                          <FileText size={16} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontSize: 'var(--font-sm)' }}>{p.date}</span>
                          <span className={`badge badge-dot ${p.status === 'Payé' ? 'badge-success' : 'badge-danger'}`} style={{ transform: 'scale(0.85)' }}>{p.status}</span>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>{formatFCFA(p.amount)}</div>
                      </div>
                    ))}
                  </div>
                ) : <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)' }}>Aucun paiement.</div>}
              </div>
            </div>
          )
        })()}
      </Modal>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Enregistrer un locataire">
        <form onSubmit={handleAddTenant} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div className="grid-2">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Prénom</label><input type="text" name="firstName" required placeholder="Ex: Moussa" /></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Nom</label><input type="text" name="lastName" required placeholder="Ex: Badiane" /></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Téléphone</label><input type="tel" name="phone" required placeholder="Ex: 77 000 00 00" /></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Email</label><input type="email" name="email" required placeholder="Ex: email@domaine.sn" /></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Cibler un bien</label>
              <select name="propertyId" required onChange={handlePropertyChange}>
                <option value="">Sélectionnez un bien...</option>
                {allProperties.map(p => <option key={p.id} value={p.id}>{p.title} — {p.address}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Loyer (FCFA)</label>
              <input type="number" name="rent" required placeholder="Ex: 250000" value={addFormRent} onChange={(e) => setAddFormRent(e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Caution (FCFA)</label><input type="number" name="depositAmount" required placeholder="Ex: 500000" /></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Date d'entrée</label>
              <input type="date" name="dateEntree" required value={addFormDate} onChange={(e) => setAddFormDate(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setIsAddModalOpen(false)}>Annuler</button>
            <button type="submit" className="btn btn-primary">Créer le bail</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Modifier le locataire">
        {editingTenant && (
          <form onSubmit={handleUpdateTenant} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <div className="grid-2">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Prénom</label><input type="text" name="firstName" required defaultValue={editingTenant.firstName} /></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Nom</label><input type="text" name="lastName" required defaultValue={editingTenant.lastName} /></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Téléphone</label><input type="tel" name="phone" required defaultValue={editingTenant.phone} /></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Email</label><input type="email" name="email" required defaultValue={editingTenant.email} /></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Loyer (FCFA)</label>
                <input type="number" name="rent" required defaultValue={editingTenant.rent} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Caution (FCFA)</label><input type="number" name="depositAmount" required defaultValue={editingTenant.depositAmount} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setIsEditModalOpen(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary">Enregistrer</button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={confirmPaymentModal} onClose={() => handleConfirmFirstPayment(false)} title="Encaissement du loyer">
        {newlyCreatedTenant && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', padding: 'var(--space-md)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--space-md)' }}>
                Avez-vous encaissé le loyer pour <strong>{newlyCreatedTenant.firstName} {newlyCreatedTenant.lastName}</strong> ?
              </div>
              <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>
                Date d'entrée : {new Date(newlyCreatedTenant.dateEntree).toLocaleDateString('fr-FR')}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-md)' }}>
              <button
                className="btn btn-ghost"
                onClick={() => handleConfirmFirstPayment(false)}
                style={{ minWidth: 140 }}
              >
                Pas encore
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleConfirmFirstPayment(true)}
                style={{ minWidth: 140, background: 'var(--success)' }}
              >
                Oui, encaissé
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Toast message={toastMessage} onClose={() => setToastMessage('')} />
    </div>
  )
}
