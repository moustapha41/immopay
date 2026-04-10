import { useState, useEffect } from 'react'
import {
  Search, Plus, Hammer, Droplet, Zap, ShieldAlert,
  Percent, Edit, Trash, BanknoteIcon
} from 'lucide-react'
import { charges as chargesApi, properties as propertiesApi } from '../api'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import ConfirmModal from '../components/ConfirmModal'

function formatFCFA(amount) { return (amount || 0).toLocaleString('fr-FR') + ' FCFA' }

const typeIcons = {
  'Eau': <Droplet size={14} />, 'Électricité': <Zap size={14} />,
  'Travaux': <Hammer size={14} />, 'Assurance': <ShieldAlert size={14} />, 'Taxe': <Percent size={14} />,
}

function Charges() {
  const [activeTab, setActiveTab] = useState('tenant')
  const [searchTerm, setSearchTerm] = useState('')
  const [tenantCharges, setTenantCharges] = useState([])
  const [ownerCharges, setOwnerCharges] = useState([])
  const [allProperties, setAllProperties] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCharge, setEditingCharge] = useState(null)
  const [itemToDelete, setItemToDelete] = useState(null)
  const [toastMessage, setToastMessage] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [tc, oc, props] = await Promise.all([
          chargesApi.getAll({ category: 'tenant' }),
          chargesApi.getAll({ category: 'owner' }),
          propertiesApi.getAll(),
        ])
        setTenantCharges(tc)
        setOwnerCharges(oc)
        setAllProperties(props)
      } catch (err) { setToastMessage('Erreur: ' + err.message) }
    }
    load()
  }, [])

  const handleDeleteConfirm = async () => {
    if (itemToDelete) {
      try {
        await chargesApi.remove(itemToDelete.id)
        if (itemToDelete.type === 'tenant') setTenantCharges(tenantCharges.filter(x => x.id !== itemToDelete.id))
        else setOwnerCharges(ownerCharges.filter(x => x.id !== itemToDelete.id))
        setToastMessage("Charge supprimée.")
      } catch (err) { setToastMessage('Erreur: ' + err.message) }
      setItemToDelete(null)
      setTimeout(() => setToastMessage(''), 3000)
    }
  }

  const handleSaveCharge = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const category = formData.get('chargeType') || activeTab
    const payload = {
      category,
      label: formData.get('label'),
      type: formData.get('type'),
      propertyId: formData.get('propertyId'),
      period: 'Avril 2026',
    }
    if (category === 'tenant') { payload.reel = parseInt(formData.get('amount')); payload.status = 'À régulariser' }
    else { payload.amount = parseInt(formData.get('amount')); payload.status = 'En attente'; payload.date = new Date().toISOString().split('T')[0] }

    try {
      if (editingCharge) {
        const updated = await chargesApi.update(editingCharge.id, payload)
        if (category === 'tenant') setTenantCharges(tenantCharges.map(c => c.id === editingCharge.id ? updated : c))
        else setOwnerCharges(ownerCharges.map(c => c.id === editingCharge.id ? updated : c))
        setToastMessage(`Charge mise à jour.`)
      } else {
        const created = await chargesApi.create(payload)
        if (category === 'tenant') setTenantCharges([created, ...tenantCharges])
        else setOwnerCharges([created, ...ownerCharges])
        setToastMessage(`Charge enregistrée.`)
      }
    } catch (err) { setToastMessage('Erreur: ' + err.message) }
    setIsModalOpen(false)
    setTimeout(() => setToastMessage(''), 3000)
  }

  const handleSettleTenant = async (id) => {
    try {
      const updated = await chargesApi.settle(id)
      setTenantCharges(tenantCharges.map(c => c.id === id ? updated : c))
      setToastMessage(`Charge régularisée.`)
    } catch (err) { setToastMessage('Erreur: ' + err.message) }
    setTimeout(() => setToastMessage(''), 3000)
  }

  const handleSettleOwner = async (id) => {
    try {
      const updated = await chargesApi.settle(id)
      setOwnerCharges(ownerCharges.map(c => c.id === id ? updated : c))
      setToastMessage(`Dépense réglée.`)
    } catch (err) { setToastMessage('Erreur: ' + err.message) }
    setTimeout(() => setToastMessage(''), 3000)
  }

  const displayedList = activeTab === 'tenant' ? tenantCharges : ownerCharges
  const filtered = displayedList.filter(c => c.label.toLowerCase().includes(searchTerm.toLowerCase()) || (c.propertyName || '').toLowerCase().includes(searchTerm.toLowerCase()))
  const tenantTotalReel = tenantCharges.reduce((s, c) => s + (c.reel || 0), 0)
  const tenantTotalProv = tenantCharges.reduce((s, c) => s + (c.provision || 0), 0)
  const ownerTotal = ownerCharges.reduce((s, c) => s + (c.amount || 0), 0)

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div><h1>Charges</h1><p>Charges locataires récupérables et dépenses propriétaire</p></div>
        <button className="btn btn-primary" onClick={() => { setEditingCharge(null); setIsModalOpen(true) }}><Plus size={16} /> Nouvelle charge</button>
      </div>

      <div className="stats-grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="stat-card"><div className="stat-card-icon blue"><Zap size={22} /></div><div className="stat-card-value">{formatFCFA(tenantTotalReel)}</div><div className="stat-card-label">Total Charges Locatives</div></div>
        <div className="stat-card"><div className="stat-card-icon gold"><Percent size={22} /></div><div className="stat-card-value">{formatFCFA(tenantTotalProv)}</div><div className="stat-card-label">Provisions perçues</div></div>
        <div className="stat-card"><div className="stat-card-icon red"><Hammer size={22} /></div><div className="stat-card-value">{formatFCFA(ownerTotal)}</div><div className="stat-card-label">Dépenses Propriétaire</div></div>
      </div>

      <div className="filter-bar">
        <div className="search-bar"><Search size={16} /><input type="text" placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
        <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none' }}>
          <button className={`tab ${activeTab === 'tenant' ? 'active' : ''}`} onClick={() => setActiveTab('tenant')}>Charges Locataires</button>
          <button className={`tab ${activeTab === 'owner' ? 'active' : ''}`} onClick={() => setActiveTab('owner')}>Charges Propriétaire</button>
        </div>
      </div>

      <div className="card">
        {activeTab === 'tenant' ? (
          <table className="data-table">
            <thead><tr><th>Nature</th><th>Locataire</th><th>Bien</th><th>Période</th><th>Provision</th><th>Réel</th><th>Statut</th><th></th></tr></thead>
            <tbody>{filtered.map(item => (
              <tr key={item.id}>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><span style={{ color: 'var(--accent-primary)' }}>{typeIcons[item.type] || <Percent size={14} />}</span><span style={{ fontWeight: 600 }}>{item.label}</span></div></td>
                <td>{item.tenantName}</td><td style={{ color: 'var(--text-secondary)' }}>{item.propertyName}</td><td>{item.period}</td>
                <td>{formatFCFA(item.provision)}</td><td style={{ fontWeight: 600 }}>{formatFCFA(item.reel)}</td>
                <td><span className={`badge badge-dot ${item.status === 'Régularisé' ? 'badge-success' : 'badge-warning'}`}>{item.status}</span></td>
                <td><div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                  <button className="icon-btn" onClick={() => { setEditingCharge(item); setIsModalOpen(true) }}><Edit size={15} /></button>
                  {item.status === 'À régulariser' && <button className="icon-btn" onClick={() => handleSettleTenant(item.id)}><BanknoteIcon size={15} color="var(--accent-gold)" /></button>}
                  <button className="icon-btn" onClick={() => setItemToDelete({ id: item.id, type: 'tenant' })}><Trash size={15} color="var(--danger)" /></button>
                </div></td>
              </tr>))}</tbody>
          </table>
        ) : (
          <table className="data-table">
            <thead><tr><th>Description</th><th>Bien</th><th>Type</th><th>Date</th><th>Montant</th><th>Statut</th><th></th></tr></thead>
            <tbody>{filtered.map(item => (
              <tr key={item.id}>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><span style={{ color: 'var(--danger)' }}>{typeIcons[item.type] || <Hammer size={14} />}</span><span style={{ fontWeight: 600 }}>{item.label}</span></div></td>
                <td style={{ color: 'var(--text-secondary)' }}>{item.propertyName}</td><td><span className="badge badge-primary">{item.type}</span></td><td>{item.date}</td>
                <td style={{ fontWeight: 600, color: 'var(--danger)' }}>{formatFCFA(item.amount)}</td>
                <td><span className={`badge badge-dot ${item.status === 'Payé' ? 'badge-success' : 'badge-warning'}`}>{item.status}</span></td>
                <td><div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                  <button className="icon-btn" onClick={() => { setEditingCharge(item); setIsModalOpen(true) }}><Edit size={15} /></button>
                  {item.status === 'En attente' && <button className="icon-btn" onClick={() => handleSettleOwner(item.id)}><BanknoteIcon size={15} color="var(--accent-gold)" /></button>}
                  <button className="icon-btn" onClick={() => setItemToDelete({ id: item.id, type: 'owner' })}><Trash size={15} color="var(--danger)" /></button>
                </div></td>
              </tr>))}</tbody>
          </table>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCharge ? "Modifier la charge" : "Enregistrer une charge"}>
        <form onSubmit={handleSaveCharge} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div className="grid-2">
            {!editingCharge && <div style={{ display: 'flex', flexDirection: 'column', gap: 8, gridColumn: '1 / -1' }}><label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Qui paie ?</label><div style={{ display: 'flex', gap: 'var(--space-md)' }}><label className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}><input type="radio" name="chargeType" value="tenant" defaultChecked style={{ marginRight: 8 }} /> Locative</label><label className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}><input type="radio" name="chargeType" value="owner" style={{ marginRight: 8 }} /> Propriétaire</label></div></div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, gridColumn: '1 / -1' }}><label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Libellé</label><input type="text" name="label" required defaultValue={editingCharge?.label || ''} placeholder="Libellé" /></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Type</label><select name="type" defaultValue={editingCharge?.type || 'Eau'}><option value="Eau">Eau</option><option value="Électricité">Électricité</option><option value="Ordures">Ordures</option><option value="Gardiennage">Gardiennage</option><option value="Travaux">Travaux</option><option value="Taxe">Taxes</option></select></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Montant (FCFA)</label><input type="number" name="amount" required defaultValue={editingCharge?.amount || editingCharge?.reel || ''} placeholder="Ex: 15000" min="0" step="1000" /></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, gridColumn: '1 / -1' }}><label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Bien concerné</label><select name="propertyId" defaultValue={editingCharge?.propertyId || 'all'}><option value="all">Tous les biens</option>{allProperties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Annuler</button>
            <button type="submit" className="btn btn-primary">{editingCharge ? "Mettre à jour" : "Ajouter"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} onConfirm={handleDeleteConfirm} title="Confirmation" message="Supprimer cette charge ?" />
      <Toast message={toastMessage} onClose={() => setToastMessage('')} />
    </div>
  )
}

export default Charges
