import { useState, useEffect } from 'react'
import {
  Search, SlidersHorizontal, Building2, MapPin, BedDouble,
  Maximize2, Plus, Edit, Trash
} from 'lucide-react'
import { properties as propertiesApi } from '../api'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import ConfirmModal from '../components/ConfirmModal'

function formatFCFA(amount) {
  return (amount || 0).toLocaleString('fr-FR') + ' FCFA'
}

const statusConfig = {
  'Loué': 'badge-success',
  'Disponible': 'badge-primary',
  'En travaux': 'badge-warning',
}

function Properties() {
  const [activeTab, setActiveTab] = useState('Tous')
  const [viewMode, setViewMode] = useState('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [localProperties, setLocalProperties] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProperty, setEditingProperty] = useState(null)
  const [itemToDelete, setItemToDelete] = useState(null)
  const [toastMessage, setToastMessage] = useState('')

  const loadProperties = async () => {
    try {
      const data = await propertiesApi.getAll()
      setLocalProperties(data)
    } catch (err) {
      setToastMessage('Erreur: ' + err.message)
    }
  }

  useEffect(() => { loadProperties() }, [])

  const openAddModal = () => { setEditingProperty(null); setIsModalOpen(true) }
  const openEditModal = (property) => { setEditingProperty(property); setIsModalOpen(true) }

  const handleDelete = async () => {
    if (itemToDelete) {
      try {
        await propertiesApi.remove(itemToDelete)
        setLocalProperties(localProperties.filter(x => x.id !== itemToDelete))
        setToastMessage("Bien supprimé avec succès.")
      } catch (err) {
        setToastMessage('Erreur: ' + err.message)
      }
      setItemToDelete(null)
      setTimeout(() => setToastMessage(''), 3000)
    }
  }

  const handleSaveProperty = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const payload = {
      title: formData.get('title'),
      type: formData.get('type'),
      city: formData.get('city'),
      address: formData.get('city'),
      price: formData.get('price'),
      surface: parseInt(formData.get('surface')),
      rooms: parseInt(formData.get('rooms')),
      bedrooms: Math.max(1, parseInt(formData.get('rooms')) - 1),
      status: formData.get('status'),
    }

    try {
      if (editingProperty) {
        const updated = await propertiesApi.update(editingProperty.id, payload)
        setLocalProperties(localProperties.map(p => p.id === editingProperty.id ? updated : p))
        setToastMessage(`Le bien "${payload.title}" a été mis à jour.`)
      } else {
        const created = await propertiesApi.create(payload)
        setLocalProperties([created, ...localProperties])
        setToastMessage(`Le bien "${payload.title}" a été ajouté avec succès.`)
      }
    } catch (err) {
      setToastMessage('Erreur: ' + err.message)
    }

    setIsModalOpen(false)
    setTimeout(() => setToastMessage(''), 3000)
  }

  const filteredProperties = localProperties
    .filter(p => activeTab === 'Tous' || p.status === activeTab)
    .filter(p =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.city.toLowerCase().includes(searchTerm.toLowerCase())
    )

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Gestion des Biens</h1>
          <p>{localProperties.length} biens en portefeuille</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} /> Ajouter un bien
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-bar">
          <Search size={16} />
          <input type="text" placeholder="Rechercher un bien..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none' }}>
          {['Tous', 'Loué', 'Disponible', 'En travaux'].map(tab => (
            <button key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
            <SlidersHorizontal size={14} /> {viewMode === 'grid' ? 'Liste' : 'Grille'}
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="property-grid stagger">
          {filteredProperties.map(property => (
            <div key={property.id} className="property-card">
              <div className="property-card-image">
                <Building2 size={48} />
                <div className="property-card-badge">
                  <span className={`badge ${statusConfig[property.status]}`}>{property.status}</span>
                </div>
              </div>
              <div className="property-card-body">
                <div className="property-card-title">{property.title}</div>
                <div className="property-card-location"><MapPin size={14} /> {property.address}</div>
                <div className="property-card-details">
                  <div className="property-card-detail"><Maximize2 size={14} /> {property.surface} m²</div>
                  <div className="property-card-detail"><Building2 size={14} /> {property.rooms} pièces</div>
                  <div className="property-card-detail"><BedDouble size={14} /> {property.bedrooms} ch.</div>
                </div>
                <div className="property-card-footer">
                  <div className="property-card-price">{formatFCFA(property.price)} <span>/mois</span></div>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <button className="icon-btn" title="Modifier" onClick={() => openEditModal(property)}><Edit size={18} /></button>
                    <button className="icon-btn" title="Supprimer" onClick={() => setItemToDelete(property.id)}><Trash size={18} style={{ color: 'var(--danger)' }} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead><tr><th>Bien</th><th>Localisation</th><th>Type</th><th>Surface</th><th>Loyer</th><th>Statut</th><th>Locataire</th><th></th></tr></thead>
            <tbody>
              {filteredProperties.map(property => (
                <tr key={property.id}>
                  <td><div style={{ fontWeight: 600 }}>{property.title}</div></td>
                  <td><div style={{ color: 'var(--text-secondary)' }}>{property.city}</div></td>
                  <td>{property.type}</td>
                  <td>{property.surface} m²</td>
                  <td style={{ fontWeight: 600, color: 'var(--accent-gold)' }}>{property.price}</td>
                  <td><span className={`badge badge-dot ${statusConfig[property.status]}`}>{property.status}</span></td>
                  <td>{property.tenantName || <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>—</span>}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                      <button className="icon-btn" title="Modifier" onClick={() => openEditModal(property)}><Edit size={15} /></button>
                      <button className="icon-btn" title="Supprimer" onClick={() => setItemToDelete(property.id)}><Trash size={15} color="var(--danger)" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProperty ? "Modifier le bien" : "Ajouter un nouveau bien"}>
        <form onSubmit={handleSaveProperty} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div className="grid-2">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Titre de l'annonce / Nom du bien</label>
              <input type="text" name="title" required defaultValue={editingProperty ? editingProperty.title : ''} placeholder="Ex: Appartement F4 Almadies" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Type de bien</label>
              <select name="type" required defaultValue={editingProperty ? editingProperty.type : 'Appartement'}>
                <option value="Appartement">Appartement</option><option value="Villa">Villa</option><option value="Studio">Studio</option><option value="Bureau">Bureau/Local pro</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Ville / Quartier</label>
              <input type="text" name="city" required defaultValue={editingProperty ? editingProperty.city : ''} placeholder="Ex: Dakar, Ngor" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Surface (m²)</label>
              <input type="number" name="surface" required defaultValue={editingProperty ? editingProperty.surface : ''} placeholder="Ex: 85" min="9" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Nombre de pièces</label>
              <input type="number" name="rooms" required defaultValue={editingProperty ? editingProperty.rooms : ''} placeholder="Ex: 3" min="1" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Loyer mensuel (FCFA)</label>
              <input type="text" name="price" required defaultValue={editingProperty ? editingProperty.price : ''} placeholder="Ex: 350000 ou À discuter" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Statut actuel</label>
              <select name="status" defaultValue={editingProperty ? editingProperty.status : 'Disponible'}>
                <option value="Disponible">Disponible</option><option value="Loué">Loué</option><option value="En travaux">En travaux</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Annuler</button>
            <button type="submit" className="btn btn-primary">{editingProperty ? "Mettre à jour" : "Enregistrer le bien"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} onConfirm={handleDelete} title="Confirmation" message="Êtes-vous sûr de vouloir supprimer ce bien ?" />
      <Toast message={toastMessage} onClose={() => setToastMessage('')} />
    </div>
  )
}

export default Properties
