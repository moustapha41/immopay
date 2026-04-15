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
  const [settleModal, setSettleModal] = useState(null)

  // ── États pour la sélection de bien avancée ──
  const [selectedAddProperty, setSelectedAddProperty] = useState(null)
  const [propertyOccupancy, setPropertyOccupancy] = useState(null)
  const [selectedFloor, setSelectedFloor] = useState('')

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
        floor: selectedFloor || null,
      })
      setLocalTenants([created, ...localTenants])
      setIsAddModalOpen(false)
      setSelectedAddProperty(null)
      setPropertyOccupancy(null)
      setSelectedFloor('')
      setNewlyCreatedTenant(created)
      setConfirmPaymentModal(true)
      setToastMessage(`Le locataire ${created.firstName} a été ajouté.`)
      // Recharger les biens pour mettre à jour les statuts
      const updatedProps = await propertiesApi.getAll()
      setAllProperties(updatedProps)
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

  const handleSettleClick = (tenant) => {
    const tenantPayments = localPayments.filter(p => p.tenantId === tenant.id)
    const unpaidPayment = tenantPayments.find(p => ['En retard', 'Partiel'].includes(p.status))
    if (!unpaidPayment) return
    const missing = unpaidPayment.amount - (unpaidPayment.amountPaid || 0)
    setSettleModal({ tenant, missing, method: 'Espèces', defaultAmount: missing })
  }

  const handleSettleSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const amountPaid = parseInt(formData.get('amountPaid'))
    const method = formData.get('method')
    
    try {
      await tenantsApi.settle(settleModal.tenant.id, { amountPaid, method })
      const updatedPayments = await paymentsApi.getAll()
      setLocalPayments(updatedPayments)
      setToastMessage(`Paiement enregistré pour ${settleModal.tenant.firstName}.`)
      setSettleModal(null)
    } catch (err) {
      setToastMessage('Erreur: ' + err.message)
    }
    setTimeout(() => setToastMessage(''), 3000)
  }

  const handlePropertyChange = async (e) => {
    const propId = parseInt(e.target.value)
    const prop = allProperties.find(p => p.id === propId)
    setSelectedAddProperty(prop || null)
    setSelectedFloor('')
    setPropertyOccupancy(null)

    if (prop && prop.price) {
      setAddFormRent(prop.price)
    } else {
      setAddFormRent('')
    }

    // Charger les infos d'occupation si c'est un Immeuble ou une Colocation
    if (prop && (prop.type === 'Immeuble' || prop.type === 'Colocation')) {
      try {
        const occ = await propertiesApi.getOccupancy(prop.id)
        setPropertyOccupancy(occ)
      } catch (err) {
        setToastMessage('Erreur chargement occupation: ' + err.message)
      }
    }
  }

  const handleDeleteTenant = async (id) => {
    if (window.confirm("Voulez-vous vraiment supprimer ce locataire ?")) {
      try {
        await tenantsApi.remove(id)
        setLocalTenants(localTenants.filter(t => t.id !== id))
        setToastMessage('Locataire supprimé avec succès.')
        // Recharger les biens pour mettre à jour les statuts
        const updatedProps = await propertiesApi.getAll()
        setAllProperties(updatedProps)
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

  // ── Propriétés disponibles pour la création (exclure Loué et Complet) ──
  const availableProperties = allProperties.filter(p =>
    p.status !== 'Loué' && p.status !== 'Complet'
  )

  // ── Générer la liste des étages pour un immeuble ──
  const getAvailableFloors = () => {
    if (!selectedAddProperty || selectedAddProperty.type !== 'Immeuble') return []
    const levelsMatch = (selectedAddProperty.title || '').match(/R\+(\d+)/)
    let maxLevel = levelsMatch ? parseInt(levelsMatch[1]) : (selectedAddProperty.maxTenants > 0 ? selectedAddProperty.maxTenants - 1 : 1)
    
    // Si pour une raison quelconque maxLevel est trop bas, on s'assure qu'il couvre au moins les étages déjà loués
    if (propertyOccupancy && propertyOccupancy.occupiedFloors) {
      const maxOccupied = Math.max(0, ...propertyOccupancy.occupiedFloors.map(f => {
        if (!f) return 0;
        const m = f.match(/R\+(\d+)/);
        return m ? parseInt(m[1]) : 0;
      }));
      if (maxOccupied > maxLevel) maxLevel = maxOccupied;
    }

    const allFloors = ['RDC (Rez-de-chaussée)']
    for (let i = 1; i <= maxLevel; i++) {
      allFloors.push(`R+${i}`)
    }
    const occupiedFloors = propertyOccupancy ? propertyOccupancy.occupiedFloors : []
    return allFloors.map(floor => ({
      value: floor,
      label: floor,
      occupied: occupiedFloors.includes(floor)
    }))
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
        <button className="btn btn-primary" onClick={() => { setIsAddModalOpen(true); setSelectedAddProperty(null); setPropertyOccupancy(null); setSelectedFloor('') }}><Plus size={16} /> Nouveau locataire</button>
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
                      {unpaidCount > 0 && <button className="btn btn-primary btn-sm" onClick={() => handleSettleClick(tenant)}><BanknoteIcon size={14} style={{ marginRight: 4 }} /> Régler</button>}
                      <button className="icon-btn" title="Copier le lien" onClick={() => handleCopyLink(tenant.token)}><Link size={15} /></button>
                      <button className="icon-btn" title="Voir la fiche" onClick={async () => {
                        try {
                          const fullTenant = await tenantsApi.getById(tenant.id)
                          setSelectedTenant(fullTenant)
                        } catch (err) {
                          setToastMessage('Erreur: ' + err.message)
                        }
                      }}><Eye size={15} /></button>
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
              <div className="stats-grid" style={{ gridTemplateColumns: '1fr', gap: 'var(--space-md)' }}>
                <div style={{ padding: 'var(--space-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>Historique des Baux</div>
                  {selectedTenant.leases && selectedTenant.leases.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                      {selectedTenant.leases.map(lease => (
                        <div key={lease.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-sm)', background: '#fff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)', display: 'flex', alignItems: 'center', gap: 6 }}><Home size={14} color="var(--accent-primary)"/> {lease.property?.title || 'Bien inconnu'}{lease.floor ? ` · ${lease.floor}` : ''}</div>
                            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Bail: {lease.bailNumber} • {formatFCFA(lease.rent)}</div>
                          </div>
                          <div>
                            <span className={`badge ${lease.status === 'Actif' ? 'badge-success' : 'badge-warning'}`}>{lease.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)' }}>Aucun bail enregistré.</div>}
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

      <Modal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); setSelectedAddProperty(null); setPropertyOccupancy(null); setSelectedFloor('') }} title="Enregistrer un locataire">
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
                {availableProperties.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title} — {p.address}
                    {p.status === 'Partiellement Loué' ? ' (Partiellement loué)' : ''}
                  </option>
                ))}
              </select>
              {allProperties.length > 0 && availableProperties.length === 0 && (
                <small style={{ color: 'var(--danger)', fontWeight: 500 }}>Aucun bien disponible. Tous les biens sont loués ou complets.</small>
              )}
            </div>

            {/* ── Info d'occupation pour Immeuble ou Colocation ── */}
            {selectedAddProperty && propertyOccupancy && (
              <div style={{ gridColumn: '1 / -1', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {selectedAddProperty.type === 'Immeuble' ? '🏢' : '👥'} Occupation — {selectedAddProperty.title}
                  </div>
                  <span className={`badge ${
                    propertyOccupancy.occupiedCount === 0 ? 'badge-primary' :
                    propertyOccupancy.availableCount === 0 ? 'badge-danger' : 'badge-info'
                  }`}>
                    {propertyOccupancy.occupiedCount === 0 ? 'Disponible' :
                     propertyOccupancy.availableCount === 0 ? 'Complet' : 'Partiellement Loué'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-lg)', fontSize: 'var(--font-sm)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, padding: 'var(--space-sm)', background: 'rgba(255,255,255,0.6)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontWeight: 700, fontSize: 'var(--font-lg)', color: 'var(--text-primary)' }}>{propertyOccupancy.totalUnits}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)' }}>{selectedAddProperty.type === 'Immeuble' ? 'Étages total' : 'Places totales'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, padding: 'var(--space-sm)', background: 'rgba(239,68,68,0.06)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontWeight: 700, fontSize: 'var(--font-lg)', color: 'var(--danger)' }}>{propertyOccupancy.occupiedCount}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)' }}>{selectedAddProperty.type === 'Immeuble' ? 'Étages occupés' : 'Places occupées'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, padding: 'var(--space-sm)', background: 'rgba(16,185,129,0.06)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontWeight: 700, fontSize: 'var(--font-lg)', color: 'var(--success)' }}>{propertyOccupancy.availableCount}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)' }}>{selectedAddProperty.type === 'Immeuble' ? 'Étages disponibles' : 'Places disponibles'}</span>
                  </div>
                </div>
                {/* Détail des locataires par étage/place */}
                {propertyOccupancy.activeLeases && propertyOccupancy.activeLeases.length > 0 && (
                  <div style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                    {propertyOccupancy.activeLeases.map((l, i) => (
                      <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(239,68,68,0.08)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', marginRight: 6, marginBottom: 4 }}>
                        {l.floor ? `${l.floor}:` : '•'} {l.tenant}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Sélection d'étage pour les Immeubles ── */}
            {selectedAddProperty && selectedAddProperty.type === 'Immeuble' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Étage à louer</label>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                  {getAvailableFloors().map(floor => (
                    <button
                      key={floor.value}
                      type="button"
                      disabled={floor.occupied}
                      onClick={() => setSelectedFloor(floor.value)}
                      style={{
                        padding: '10px 18px',
                        borderRadius: 'var(--radius-md)',
                        cursor: floor.occupied ? 'not-allowed' : 'pointer',
                        fontWeight: 600,
                        fontSize: 'var(--font-sm)',
                        border: selectedFloor === floor.value
                          ? '2px solid var(--accent-primary)'
                          : floor.occupied
                          ? '1.5px solid var(--border-color)'
                          : '1.5px solid var(--border-color)',
                        background: selectedFloor === floor.value
                          ? 'rgba(59,130,246,0.12)'
                          : floor.occupied
                          ? 'rgba(239,68,68,0.06)'
                          : 'var(--bg-secondary)',
                        color: selectedFloor === floor.value
                          ? 'var(--accent-primary)'
                          : floor.occupied
                          ? 'var(--text-muted)'
                          : 'var(--text-secondary)',
                        opacity: floor.occupied ? 0.6 : 1,
                        transition: 'all 0.2s ease',
                        position: 'relative',
                        textDecoration: floor.occupied ? 'line-through' : 'none',
                      }}
                    >
                      {floor.label}
                      {floor.occupied && (
                        <span style={{
                          position: 'absolute', top: -6, right: -6,
                          background: 'var(--danger)', color: '#fff',
                          fontSize: '9px', padding: '1px 5px', borderRadius: '10px',
                          fontWeight: 700,
                        }}>Loué</span>
                      )}
                    </button>
                  ))}
                </div>
                {selectedFloor && (
                  <small style={{ color: 'var(--success)', fontWeight: 500 }}>
                    ✓ Étage sélectionné : <strong>{selectedFloor}</strong>
                  </small>
                )}
              </div>
            )}

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
            <button type="button" className="btn btn-ghost" onClick={() => { setIsAddModalOpen(false); setSelectedAddProperty(null); setPropertyOccupancy(null); setSelectedFloor('') }}>Annuler</button>
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

      <Modal isOpen={!!settleModal} onClose={() => setSettleModal(null)} title="Encaisser un paiement">
        {settleModal && (
          <form onSubmit={handleSettleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
               <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>Reste à payer</div>
               <div style={{ color: '#ef4444', fontSize: '24px', fontWeight: 700 }}>{formatFCFA(settleModal.missing)}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Montant reçu (FCFA)</label>
              <input type="number" name="amountPaid" required min="1" max={settleModal.missing} defaultValue={settleModal.missing} />
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Si le montant est inférieur au reste à payer, le paiement sera marqué comme "Partiel".</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Méthode de paiement</label>
              <select name="method" required defaultValue="Espèces">
                <option value="Espèces">Espèces</option>
                <option value="Virement Bancaire">Virement Bancaire</option>
                <option value="Chèque">Chèque</option>
                <option value="Mobile Money">Mobile Money (Orange/Wave...)</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setSettleModal(null)}>Annuler</button>
              <button type="submit" className="btn btn-primary">Enregistrer le paiement</button>
            </div>
          </form>
        )}
      </Modal>

      <Toast message={toastMessage} onClose={() => setToastMessage('')} />
    </div>
  )
}
