import { useState, useEffect } from 'react'
import {
  Search, SlidersHorizontal, Building2, MapPin, BedDouble,
  Maximize2, Plus, Edit, Trash, ChevronRight, ChevronDown,
  Home, Users, Layers, Eye, ArrowLeft, FileText, DoorOpen, X,
  Store, Hotel, Coffee, Briefcase, LandPlot, TreePine, Map
} from 'lucide-react'
import { properties as propertiesApi, leases as leasesApi, tenants as tenantsApi } from '../api'
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
  'Partiellement Loué': 'badge-info',
  'Complet': 'badge-danger',
}

const typeIcons = {
  'Maison individuelle': Home, 'Appartement': Building2, 'Villa': Home,
  'Studio': Building2, 'Duplex': Building2, 'Colocation': Users,
  'Logement social': Building2, 'Immeuble': Layers, 'Chambre': DoorOpen,
  'Local commercial': Store, 'Centre commercial': Store,
  'Restaurant / Hôtel / Café': Hotel, 'Bureau': Briefcase,
  'Terrain constructible': LandPlot, 'Terrain non constructible': TreePine,
  'Terrain en zone urbaine': Map, 'Maison': Home,
}

// Catégories et sous-types
const propertyCategories = [
  {
    key: 'Résidentiel',
    icon: '🏠',
    label: 'Résidentiel',
    desc: "Habitation des particuliers",
    types: [
      { value: 'Maison individuelle', label: 'Maison individuelle' },
      { value: 'Villa', label: 'Villa' },
      { value: 'Appartement', label: 'Appartement' },
      { value: 'Studio', label: 'Studio' },
      { value: 'Duplex', label: 'Duplex' },
      { value: 'Colocation', label: 'Colocation' },
      { value: 'Logement social', label: 'Logement social (HLM)' },
      { value: 'Immeuble', label: 'Immeuble', isParent: true, hasLevels: true },
    ],
  },
  {
    key: 'Commercial',
    icon: '🏢',
    label: 'Commercial',
    desc: 'Activités commerciales',
    types: [
      { value: 'Local commercial', label: 'Local commercial (boutique, magasin, showroom)' },
      { value: 'Centre commercial', label: 'Centre commercial' },
      { value: 'Restaurant / Hôtel / Café', label: 'Restaurant / Hôtel / Café' },
      { value: 'Bureau', label: 'Bureau (open space, coworking)' },
    ],
  },
  {
    key: 'Terrain',
    icon: '🏗️',
    label: 'Terrains & foncier',
    desc: 'Parcelles et terrains',
    types: [
      { value: 'Terrain constructible', label: 'Terrain constructible' },
      { value: 'Terrain non constructible', label: 'Terrain non constructible' },
      { value: 'Terrain en zone urbaine', label: 'Terrain en zone urbaine' },
    ],
  },
]

const parentTypes = ['Immeuble', 'Maison']

// Types qui ont un bouton "Détails" pour voir les unités/sous-biens
const detailTypes = ['Immeuble', 'Colocation', 'Logement social', 'Duplex', 'Centre commercial']

function getCategoryForType(type) {
  for (const cat of propertyCategories) {
    if (cat.types.some(t => t.value === type)) return cat.key
  }
  return 'Résidentiel'
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

  // Form category/type state
  const [formCategory, setFormCategory] = useState('Résidentiel')
  const [formType, setFormType] = useState('Appartement')
  const [formLevels, setFormLevels] = useState('')  // R+1, R+2...
  const [terrainTransaction, setTerrainTransaction] = useState('location') // 'location' ou 'vente'

  // Détail d'un bien parent
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [childUnits, setChildUnits] = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailOccupancy, setDetailOccupancy] = useState(null)

  // Modal ajout unité enfant
  const [isChildModalOpen, setIsChildModalOpen] = useState(false)

  // Modal bail
  const [isLeaseModalOpen, setIsLeaseModalOpen] = useState(false)
  const [leaseTargetUnit, setLeaseTargetUnit] = useState(null)
  const [leaseFloor, setLeaseFloor] = useState('') // Étage pour les immeubles
  const [occupiedFloors, setOccupiedFloors] = useState([]) // Étages déjà loués
  const [allTenants, setAllTenants] = useState([])
  const [unitLeases, setUnitLeases] = useState([])
  const [isLeasesViewOpen, setIsLeasesViewOpen] = useState(false)
  const [viewingUnit, setViewingUnit] = useState(null)

  const loadProperties = async () => {
    try {
      const data = await propertiesApi.getAll()
      setLocalProperties(data)
    } catch (err) {
      showToast('Erreur: ' + err.message)
    }
  }

  useEffect(() => { loadProperties() }, [])

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 4000)
  }

  const openAddModal = () => {
    setEditingProperty(null)
    setFormCategory('Résidentiel')
    setFormType('Appartement')
    setFormLevels('')
    setIsModalOpen(true)
  }
  const openEditModal = (property) => {
    setEditingProperty(property)
    setFormCategory(property.category || getCategoryForType(property.type))
    setFormType(property.type || 'Appartement')
    // Extract levels from title if Immeuble (e.g. "R+3")
    const lvMatch = (property.title || '').match(/R\+(\d)/)
    setFormLevels(lvMatch ? lvMatch[0] : '')
    setIsModalOpen(true)
  }

  // ==================== Supprimer un bien ====================
  const handleDelete = async () => {
    if (itemToDelete) {
      try {
        await propertiesApi.remove(itemToDelete)
        setLocalProperties(localProperties.filter(x => x.id !== itemToDelete))
        if (selectedProperty && selectedProperty.id === itemToDelete) {
          setSelectedProperty(null)
        }
        showToast("Bien supprimé avec succès.")
      } catch (err) {
        showToast('Erreur: ' + (err.message || 'Suppression impossible.'))
      }
      setItemToDelete(null)
    }
  }

  // ==================== Sauvegarder (créer/modifier) un bien ====================
  const handleSaveProperty = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const formRooms = parseInt(formData.get('rooms')) || 1

    // Calcul des pièces et chambres selon le type de bien
    let rooms, bedrooms
    if (formType === 'Local commercial') {
      rooms = 1
      bedrooms = 0
    } else if (formType === 'Studio') {
      rooms = 1
      bedrooms = 1
    } else if (formType === 'Colocation') {
      rooms = formRooms
      bedrooms = formRooms
    } else if (formType.startsWith('Terrain')) {
      // Terrains : pas de pièces ni de chambres
      rooms = 0
      bedrooms = 0
    } else {
      // Bureau et autres types : choix libre
      rooms = formRooms
      bedrooms = Math.max(1, formRooms - 1)
    }

    // Calculer maxTenants automatiquement pour les immeubles
    let maxTenants = parseInt(formData.get('maxTenants')) || 1
    if (formType === 'Immeuble' && formLevels) {
      const lvlMatch = formLevels.match(/R\+(\d+)/)
      if (lvlMatch) maxTenants = parseInt(lvlMatch[1]) + 1 // +1 pour le RDC
    }

    const payload = {
      title: formData.get('title'),
      type: formType,
      category: formCategory,
      city: formData.get('city'),
      address: formData.get('city'),
      price: formData.get('price'),
      surface: parseInt(formData.get('surface')) || 0,
      rooms: rooms,
      bedrooms: bedrooms,
      status: formData.get('status'),
      maxTenants,
    }

    try {
      if (editingProperty) {
        const updated = await propertiesApi.update(editingProperty.id, payload)
        setLocalProperties(localProperties.map(p => p.id === editingProperty.id ? updated : p))
        showToast(`Le bien "${payload.title}" a été mis à jour.`)
      } else {
        const created = await propertiesApi.create(payload)
        setLocalProperties([created, ...localProperties])
        showToast(`Le bien "${payload.title}" a été ajouté avec succès.`)
      }
    } catch (err) {
      showToast('Erreur: ' + err.message)
    }

    setIsModalOpen(false)
  }

  // ==================== Ouvrir le détail d'un bien parent ====================
  const openPropertyDetail = async (property) => {
    setLoadingDetail(true)
    setDetailOccupancy(null)
    try {
      const full = await propertiesApi.getById(property.id)
      setSelectedProperty(full)
      if (full.children) {
        setChildUnits(full.children)
      } else {
        const children = await propertiesApi.getChildren(property.id)
        setChildUnits(children)
      }
      // Charger les données d'occupation (étages/places)
      if (full.type === 'Immeuble' || full.type === 'Colocation') {
        try {
          const occ = await propertiesApi.getOccupancy(full.id)
          setDetailOccupancy(occ)
        } catch (e) { /* silently ignore */ }
      }
    } catch (err) {
      showToast('Erreur: ' + err.message)
    }
    setLoadingDetail(false)
  }

  // ==================== Ajouter une unité enfant ====================
  const handleSaveChild = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const childType = selectedProperty.type === 'Maison' ? 'Chambre' : 'Appartement'
    const payload = {
      title: formData.get('title'),
      type: formData.get('type') || childType,
      city: selectedProperty.city,
      address: selectedProperty.address,
      price: formData.get('price'),
      surface: parseInt(formData.get('surface')) || 0,
      rooms: parseInt(formData.get('rooms')) || 1,
      bedrooms: Math.max(1, (parseInt(formData.get('rooms')) || 2) - 1),
      maxTenants: parseInt(formData.get('maxTenants')) || 1,
      parentId: selectedProperty.id,
    }

    try {
      const created = await propertiesApi.create(payload)
      setChildUnits([...childUnits, created])
      // Recharger le parent pour voir le statut mis à jour
      const updatedParent = await propertiesApi.getById(selectedProperty.id)
      setSelectedProperty(updatedParent)
      loadProperties()
      showToast(`Unité "${payload.title}" ajoutée avec succès.`)
    } catch (err) {
      showToast('Erreur: ' + err.message)
    }
    setIsChildModalOpen(false)
  }

  // ==================== Créer un bail ====================
  const openLeaseModal = async (unit) => {
    setLeaseTargetUnit(unit)
    setLeaseFloor('') // Reset l'étage sélectionné
    setOccupiedFloors([]) // Reset les étages occupés
    try {
      const t = await tenantsApi.getAll()
      setAllTenants(t)
      // Si c'est un immeuble, récupérer les baux existants pour voir les étages occupés
      if (unit.type === 'Immeuble') {
        const leases = await leasesApi.getAll({ propertyId: unit.id })
        const floors = leases
          .filter(l => l.status === 'Actif' && l.floor)
          .map(l => l.floor)
        setOccupiedFloors(floors)
      }
    } catch (err) {
      showToast('Erreur chargement locataires: ' + err.message)
    }
    setIsLeaseModalOpen(true)
  }

  const handleCreateLease = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const payload = {
      tenantId: parseInt(formData.get('tenantId')),
      propertyId: leaseTargetUnit.id,
      rent: parseInt(formData.get('rent')) || 0,
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate') || null,
      depositAmount: parseInt(formData.get('depositAmount')) || 0,
      floor: leaseFloor || null,
    }

    try {
      await leasesApi.create(payload)
      showToast('Bail créé avec succès.')
      // Recharger les enfants et le parent
      const children = await propertiesApi.getChildren(selectedProperty.id)
      setChildUnits(children)
      const updatedParent = await propertiesApi.getById(selectedProperty.id)
      setSelectedProperty(updatedParent)
      loadProperties()
    } catch (err) {
      showToast('Erreur: ' + err.message)
    }
    setIsLeaseModalOpen(false)
  }

  // ==================== Voir les baux d'une unité ====================
  const openLeasesView = async (unit) => {
    setViewingUnit(unit)
    try {
      const allLeases = await leasesApi.getAll({ propertyId: unit.id })
      setUnitLeases(allLeases)
    } catch (err) {
      showToast('Erreur: ' + err.message)
    }
    setIsLeasesViewOpen(true)
  }

  const handleTerminateLease = async (leaseId) => {
    try {
      await leasesApi.terminate(leaseId)
      showToast('Bail résilié avec succès.')
      // Recharger
      const allLeases = await leasesApi.getAll({ propertyId: viewingUnit.id })
      setUnitLeases(allLeases)
      const children = await propertiesApi.getChildren(selectedProperty.id)
      setChildUnits(children)
      const updatedParent = await propertiesApi.getById(selectedProperty.id)
      setSelectedProperty(updatedParent)
      loadProperties()
    } catch (err) {
      showToast('Erreur: ' + err.message)
    }
  }

  // ==================== Supprimer une unité enfant ====================
  const handleDeleteChild = async (childId) => {
    try {
      await propertiesApi.remove(childId)
      setChildUnits(childUnits.filter(c => c.id !== childId))
      const updatedParent = await propertiesApi.getById(selectedProperty.id)
      setSelectedProperty(updatedParent)
      loadProperties()
      showToast('Unité supprimée avec succès.')
    } catch (err) {
      showToast('Erreur: ' + (err.message || 'Suppression impossible.'))
    }
  }

  // ==================== Filtrage ====================
  const filteredProperties = localProperties
    .filter(p => !p.parentId) // Ne montrer que les biens racines
    .filter(p => activeTab === 'Tous' || p.status === activeTab)
    .filter(p =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.city.toLowerCase().includes(searchTerm.toLowerCase())
    )

  const tabs = ['Tous', 'Loué', 'Disponible', 'En travaux', 'Partiellement Loué', 'Complet']

  // ==================== VUE DÉTAIL (Tree View) ====================
  if (selectedProperty) {
    const isParentType = parentTypes.includes(selectedProperty.type)
    const Icon = typeIcons[selectedProperty.type] || Building2

    return (
      <div className="animate-fade-in">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <button className="btn btn-ghost" onClick={() => { setSelectedProperty(null); loadProperties() }}>
              <ArrowLeft size={18} /> Retour
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <Icon size={24} style={{ color: 'var(--accent-primary)' }} />
                <h1 style={{ margin: 0 }}>{selectedProperty.title}</h1>
              </div>
              <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
                <MapPin size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> {selectedProperty.city || selectedProperty.address}
                {' · '}
                <span className={`badge ${statusConfig[selectedProperty.status]}`}>{selectedProperty.status}</span>
              </p>
            </div>
          </div>
          {isParentType && selectedProperty.type !== 'Immeuble' && (
            <button className="btn btn-primary" onClick={() => setIsChildModalOpen(true)}>
              <Plus size={16} /> Ajouter une unité
            </button>
          )}
        </div>

        {/* Infos résumé du bien */}
        <div className="stats-grid" style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--accent-primary)' }}><Layers size={20} /></div>
            <div className="stat-content">
              <span className="stat-value">
                {detailOccupancy ? detailOccupancy.totalUnits : childUnits.length}
              </span>
              <span className="stat-label">
                {selectedProperty.type === 'Immeuble' ? 'Étages total' :
                 selectedProperty.type === 'Colocation' ? 'Places totales' : 'Unités'}
              </span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--danger, #ef4444)' }}><Users size={20} /></div>
            <div className="stat-content">
              <span className="stat-value">
                {detailOccupancy ? detailOccupancy.occupiedCount : childUnits.filter(c => c.status === 'Loué' || c.status === 'Partiellement Loué').length}
              </span>
              <span className="stat-label">
                {selectedProperty.type === 'Immeuble' ? 'Étages occupés' :
                 selectedProperty.type === 'Colocation' ? 'Places occupées' : 'Unités occupées'}
              </span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--success)' }}><Building2 size={20} /></div>
            <div className="stat-content">
              <span className="stat-value">
                {detailOccupancy ? detailOccupancy.availableCount : childUnits.filter(c => c.status === 'Disponible').length}
              </span>
              <span className="stat-label">
                {selectedProperty.type === 'Immeuble' ? 'Étages disponibles' :
                 selectedProperty.type === 'Colocation' ? 'Places disponibles' : 'Disponibles'}
              </span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--info, #3b82f6)' }}><Maximize2 size={20} /></div>
            <div className="stat-content">
              <span className="stat-value">{selectedProperty.surface} m²</span>
              <span className="stat-label">Surface totale</span>
            </div>
          </div>
        </div>

        {/* Détail des locataires par étage/place (pour Immeubles et Colocations) */}
        {detailOccupancy && detailOccupancy.activeLeases && detailOccupancy.activeLeases.length > 0 && (
          <div className="card" style={{ marginBottom: 'var(--space-xl)', padding: 'var(--space-lg)' }}>
            <h3 style={{ margin: '0 0 var(--space-md) 0', fontSize: 'var(--font-md)' }}>
              {selectedProperty.type === 'Immeuble' ? '🏢 Occupation par étage' : '👥 Occupation par place'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {detailOccupancy.activeLeases.map((lease, idx) => (
                <div key={idx} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: 'var(--space-sm) var(--space-md)',
                  background: 'rgba(16,185,129,0.05)',
                  border: '1px solid rgba(16,185,129,0.15)',
                  borderRadius: 'var(--radius-md)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <span style={{
                      background: 'var(--accent-primary)', color: '#fff',
                      padding: '2px 10px', borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--font-xs)', fontWeight: 700,
                    }}>
                      {lease.floor || `Place ${idx + 1}`}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>{lease.tenant}</span>
                  </div>
                  <span className="badge badge-success">Actif</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tree View des unités enfants */}
        {isParentType && childUnits.length > 0 ? (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: 'var(--space-lg)', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: 0 }}>
                {selectedProperty.type === 'Maison' ? '🏠 Chambres' : '🏢 Appartements / Unités'}
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {childUnits.map((unit, idx) => {
                const UnitIcon = typeIcons[unit.type] || Building2
                const activeLeases = unit.leases || []
                const occupancy = activeLeases.length
                const capacity = unit.maxTenants || 1

                return (
                  <div key={unit.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: 'var(--space-md) var(--space-lg)',
                      borderBottom: idx < childUnits.length - 1 ? '1px solid var(--border-color)' : 'none',
                      background: unit.status === 'Loué' ? 'rgba(16, 185, 129, 0.04)' :
                        unit.status === 'Partiellement Loué' ? 'rgba(59, 130, 246, 0.04)' : 'transparent',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background =
                      unit.status === 'Loué' ? 'rgba(16, 185, 129, 0.04)' :
                      unit.status === 'Partiellement Loué' ? 'rgba(59, 130, 246, 0.04)' : 'transparent'
                    }
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flex: 1 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 'var(--radius-md)',
                        background: 'var(--surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <UnitIcon size={20} style={{ color: 'var(--accent-primary)' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 'var(--font-md)' }}>{unit.title}</div>
                        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
                          {unit.surface} m² · {unit.rooms} pce(s) · Capacité: {capacity} locataire(s)
                          {unit.price && unit.price !== '0' ? ` · ${formatFCFA(unit.price)}/mois` : ''}
                        </div>
                        {activeLeases.length > 0 && (
                          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--success)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Users size={12} />
                            {activeLeases.map(l => l.tenant ? `${l.tenant.firstName} ${l.tenant.lastName}` : '').filter(Boolean).join(', ')}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <span className={`badge ${statusConfig[unit.status]}`}>{unit.status}</span>
                      <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', minWidth: 60, textAlign: 'center' }}>
                        {occupancy}/{capacity}
                      </span>

                      {/* Actions */}
                      {unit.status !== 'Loué' && unit.status !== 'Complet' && (
                        <button className="btn btn-sm btn-primary" title="Assigner un locataire" onClick={() => openLeaseModal(unit)}>
                          <Plus size={14} /> Bail
                        </button>
                      )}
                      <button className="icon-btn" title="Voir les baux" onClick={() => openLeasesView(unit)}>
                        <FileText size={16} />
                      </button>
                      <button className="icon-btn" title="Supprimer" onClick={() => handleDeleteChild(unit.id)}>
                        <Trash size={16} style={{ color: 'var(--danger)' }} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : isParentType && selectedProperty.type !== 'Immeuble' ? (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
            <Layers size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }} />
            <h3>Aucune unité enregistrée</h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Ajoutez des {selectedProperty.type === 'Maison' ? 'chambres' : 'appartements'} à ce bien pour commencer.
            </p>
            <button className="btn btn-primary" onClick={() => setIsChildModalOpen(true)}>
              <Plus size={16} /> Ajouter une unité
            </button>
          </div>
        ) : (
          /* Bien non-parent : afficher ses infos et baux */
          <div className="card">
            <div style={{ padding: 'var(--space-lg)' }}>
              <h3>Informations du bien</h3>
              <div className="grid-2" style={{ marginTop: 'var(--space-md)' }}>
                <div><strong>Type:</strong> {selectedProperty.type}</div>
                <div><strong>Surface:</strong> {selectedProperty.surface} m²</div>
                <div><strong>Pièces:</strong> {selectedProperty.rooms}</div>
                <div><strong>Loyer:</strong> {formatFCFA(selectedProperty.price)}</div>
                <div><strong>Capacité:</strong> {selectedProperty.maxTenants} locataire(s)</div>
                <div><strong>Statut:</strong> <span className={`badge ${statusConfig[selectedProperty.status]}`}>{selectedProperty.status}</span></div>
              </div>
              {selectedProperty.leases && selectedProperty.leases.length > 0 && (
                <div style={{ marginTop: 'var(--space-lg)' }}>
                  <h4>Baux</h4>
                  {selectedProperty.leases.map(lease => (
                    <div key={lease.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: 'var(--space-sm) var(--space-md)', border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-sm)',
                    }}>
                      <div>
                        <strong>{lease.tenant ? `${lease.tenant.firstName} ${lease.tenant.lastName}` : 'Locataire'}</strong>
                        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                          {formatFCFA(lease.rent)} · {lease.startDate} → {lease.endDate || 'Indéterminé'}
                        </div>
                      </div>
                      <span className={`badge ${lease.status === 'Actif' ? 'badge-success' : 'badge-warning'}`}>{lease.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== MODAL: Ajout unité enfant ==================== */}
        <Modal isOpen={isChildModalOpen} onClose={() => setIsChildModalOpen(false)} title={`Ajouter une unité à "${selectedProperty.title}"`}>
          <form onSubmit={handleSaveChild} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <div className="grid-2">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Nom de l'unité</label>
                <input type="text" name="title" required placeholder={selectedProperty.type === 'Maison' ? 'Ex: Chambre 1' : 'Ex: Appartement A1'} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Type</label>
                <select name="type" defaultValue={selectedProperty.type === 'Maison' ? 'Chambre' : 'Appartement'}>
                  <option value="Appartement">Appartement</option>
                  <option value="Chambre">Chambre</option>
                  <option value="Studio">Studio</option>
                  <option value="Bureau">Bureau</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Surface (m²)</label>
                <input type="number" name="surface" placeholder="Ex: 45" min="1" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Nombre de pièces</label>
                <input type="number" name="rooms" placeholder="Ex: 3" min="1" defaultValue="1" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Loyer mensuel (FCFA)</label>
                <input type="text" name="price" placeholder="Ex: 150000" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Capacité (colocation)</label>
                <input type="number" name="maxTenants" defaultValue="1" min="1" />
                <small style={{ color: 'var(--text-muted)' }}>Nombre max de locataires. 1 = location classique.</small>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setIsChildModalOpen(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary">Ajouter l'unité</button>
            </div>
          </form>
        </Modal>

        {/* ==================== MODAL: Créer un bail ==================== */}
        <Modal isOpen={isLeaseModalOpen} onClose={() => setIsLeaseModalOpen(false)} title={`Nouveau bail — ${leaseTargetUnit?.title || ''}`}>
          <form onSubmit={handleCreateLease} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <div className="grid-2">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Locataire</label>
                <select name="tenantId" required>
                  <option value="">— Sélectionner un locataire —</option>
                  {allTenants.map(t => (
                    <option key={t.id} value={t.id}>{t.firstName} {t.lastName} ({t.phone})</option>
                  ))}
                </select>
              </div>
              {/* Sélection d'étage pour les Immeubles */}
              {leaseTargetUnit?.type === 'Immeuble' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Étage</label>
                  <select
                    value={leaseFloor}
                    onChange={e => setLeaseFloor(e.target.value)}
                    required
                    style={{ width: '100%' }}
                  >
                    <option value="">— Sélectionner un étage —</option>
                    {(() => {
                      // Extraire les étages disponibles depuis le titre (ex: R+3)
                      const levelsMatch = (leaseTargetUnit?.title || '').match(/R\+(\d)/)
                      const maxLevel = levelsMatch ? parseInt(levelsMatch[1]) : 1
                      const allFloors = ['RDC (Rez-de-chaussée)']
                      for (let i = 1; i <= maxLevel; i++) {
                        allFloors.push(`R+${i}`)
                      }
                      // Filtrer les étages déjà loués
                      return allFloors
                        .filter(floor => !occupiedFloors.includes(floor))
                        .map(floor => (
                          <option key={floor} value={floor}>{floor}</option>
                        ))
                    })()}
                  </select>
                  <small style={{ color: 'var(--text-muted)' }}>
                    {occupiedFloors.length > 0
                      ? `Étages déjà loués: ${occupiedFloors.join(', ')}`
                      : "Sélectionnez l'étage que le locataire occupera."}
                  </small>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Loyer mensuel (FCFA)</label>
                <input type="number" name="rent" required defaultValue={leaseTargetUnit?.price || ''} placeholder="Ex: 150000" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Caution (FCFA)</label>
                <input type="number" name="depositAmount" defaultValue="0" placeholder="Ex: 300000" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Date de début</label>
                <input type="date" name="startDate" required defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Date de fin (optionnel)</label>
                <input type="date" name="endDate" />
                <small style={{ color: 'var(--text-muted)' }}>Laisser vide pour un bail indéterminé.</small>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setIsLeaseModalOpen(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary">Créer le bail</button>
            </div>
          </form>
        </Modal>

        {/* ==================== MODAL: Voir les baux d'une unité ==================== */}
        <Modal isOpen={isLeasesViewOpen} onClose={() => setIsLeasesViewOpen(false)} title={`Baux — ${viewingUnit?.title || ''}`} maxWidth="700px">
          {unitLeases.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>
              <FileText size={32} style={{ marginBottom: 'var(--space-sm)' }} />
              <p>Aucun bail enregistré pour cette unité.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {unitLeases.map(lease => (
                <div key={lease.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: 'var(--space-md)', border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)', background: lease.status === 'Actif' ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {lease.tenant ? `${lease.tenant.firstName} ${lease.tenant.lastName}` : 'Locataire'}
                    </div>
                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: 4 }}>
                      N° {lease.bailNumber} · {formatFCFA(lease.rent)}/mois · {lease.startDate} → {lease.endDate || 'Indéterminé'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <span className={`badge ${lease.status === 'Actif' ? 'badge-success' : lease.status === 'Résilié' ? 'badge-danger' : 'badge-warning'}`}>
                      {lease.status}
                    </span>
                    {lease.status === 'Actif' && (
                      <button className="btn btn-sm btn-ghost" style={{ color: 'var(--danger)' }}
                        onClick={() => handleTerminateLease(lease.id)}>
                        <X size={14} /> Résilier
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>

        <Toast message={toastMessage} onClose={() => setToastMessage('')} />
      </div>
    )
  }

  // ==================== VUE PRINCIPALE (Grille de cartes) ====================
  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Gestion des Biens</h1>
          <p>{filteredProperties.length} biens en portefeuille</p>
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
        <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none', flexWrap: 'wrap' }}>
          {tabs.map(tab => (
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
          {filteredProperties.map(property => {
            const Icon = typeIcons[property.type] || Building2
            const isParent = parentTypes.includes(property.type)
            const childCount = property.children ? property.children.length : 0

            return (
              <div key={property.id} className="property-card" style={{ cursor: isParent ? 'pointer' : 'default' }}
                onClick={isParent ? () => openPropertyDetail(property) : undefined}>
                <div className="property-card-image">
                  <Icon size={48} />
                  <div className="property-card-badge">
                    <span className={`badge ${statusConfig[property.status]}`}>{property.status}</span>
                  </div>
                  {isParent && (
                    <div style={{
                      position: 'absolute', bottom: 8, left: 8,
                      background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-xs)',
                    }}>
                      {property.type === 'Immeuble' ? `${property.maxTenants} étage(s)` :
                       property.type === 'Colocation' ? `${property.maxTenants} place(s)` :
                       `${childCount} unité(s)`}
                    </div>
                  )}
                </div>
                <div className="property-card-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isParent && <Layers size={14} style={{ color: 'var(--accent-primary)' }} />}
                    <div className="property-card-title">{property.title}</div>
                  </div>
                  <div className="property-card-location"><MapPin size={14} /> {property.address || property.city}</div>
                  <div className="property-card-details">
                    <div className="property-card-detail"><Maximize2 size={14} /> {property.surface} m²</div>
                    <div className="property-card-detail"><Building2 size={14} /> {property.rooms} pièce{property.rooms > 1 ? 's' : ''}</div>
                    {property.bedrooms > 0 && (
                      <div className="property-card-detail"><BedDouble size={14} /> {property.bedrooms} ch.</div>
                    )}
                  </div>
                  <div className="property-card-footer">
                    <div className="property-card-price">
                      {isParent ? (
                        property.type === 'Immeuble' ? `${property.maxTenants} étage(s)` :
                        property.type === 'Colocation' ? `${property.maxTenants} place(s)` :
                        `${childCount} unité(s)`
                      ) : <>{formatFCFA(property.price)} <span>/mois</span></>}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      {detailTypes.includes(property.type) && (
                        <button className="icon-btn" title={isParent ? "Voir les unités" : "Détails"} onClick={(e) => { e.stopPropagation(); openPropertyDetail(property) }}>
                          <Eye size={18} />
                        </button>
                      )}
                      <button className="icon-btn" title="Modifier" onClick={(e) => { e.stopPropagation(); openEditModal(property) }}><Edit size={18} /></button>
                      <button className="icon-btn" title="Supprimer" onClick={(e) => { e.stopPropagation(); setItemToDelete(property.id) }}><Trash size={18} style={{ color: 'var(--danger)' }} /></button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead><tr><th>Bien</th><th>Type</th><th>Localisation</th><th>Surface</th><th>Loyer</th><th>Statut</th><th>Locataire/Unités</th><th></th></tr></thead>
            <tbody>
              {filteredProperties.map(property => {
                const isParent = parentTypes.includes(property.type)
                const childCount = property.children ? property.children.length : 0
                return (
                  <tr key={property.id} style={{ cursor: 'pointer' }} onClick={() => openPropertyDetail(property)}>
                    <td><div style={{ fontWeight: 600 }}>{property.title}</div></td>
                    <td>{property.type}</td>
                    <td><div style={{ color: 'var(--text-secondary)' }}>{property.city}</div></td>
                    <td>{property.surface} m²</td>
                    <td style={{ fontWeight: 600, color: 'var(--accent-gold)' }}>{isParent ? '-' : property.price}</td>
                    <td><span className={`badge badge-dot ${statusConfig[property.status]}`}>{property.status}</span></td>
                    <td>{isParent ? (
                      property.type === 'Immeuble' ? `${property.maxTenants} étage(s)` :
                      property.type === 'Colocation' ? `${property.maxTenants} place(s)` :
                      `${childCount} unité(s)`
                    ) : (property.tenantName || <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>—</span>)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                        <button className="icon-btn" title="Modifier" onClick={(e) => { e.stopPropagation(); openEditModal(property) }}><Edit size={15} /></button>
                        <button className="icon-btn" title="Supprimer" onClick={(e) => { e.stopPropagation(); setItemToDelete(property.id) }}><Trash size={15} color="var(--danger)" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================== MODAL: Créer/Modifier un bien ==================== */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProperty ? "Modifier le bien" : "Ajouter un nouveau bien"} maxWidth="680px">
        <form onSubmit={handleSaveProperty} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

          {/* ── Titre ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Titre de l'annonce / Nom du bien</label>
            <input type="text" name="title" required defaultValue={editingProperty ? editingProperty.title : ''} placeholder="Ex: Immeuble Plateau, Résidence Sacré-Coeur" />
          </div>

          {/* ── Catégorie (radio buttons visuels) ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Catégorie du bien</label>
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              {propertyCategories.map(cat => {
                const isActive = formCategory === cat.key
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => {
                      setFormCategory(cat.key)
                      setFormType(cat.types[0].value)
                      setFormLevels('')
                    }}
                    style={{
                      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      padding: '14px 10px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                      border: isActive ? '2px solid var(--accent-primary)' : '1.5px solid var(--border-color)',
                      background: isActive ? 'rgba(59,130,246,0.08)' : 'var(--bg-secondary)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span style={{ fontSize: 24 }}>{cat.icon}</span>
                    <span style={{ fontWeight: 600, fontSize: 'var(--font-sm)', color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{cat.label}</span>
                    <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>{cat.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Type spécifique (dropdown contextuel) ── */}
          {(() => {
            const activeCat = propertyCategories.find(c => c.key === formCategory)
            if (!activeCat) return null
            const selectedTypeObj = activeCat.types.find(t => t.value === formType)
            return (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Type de bien</label>
                  <select
                    value={formType}
                    onChange={e => { setFormType(e.target.value); setFormLevels('') }}
                    style={{ width: '100%' }}
                  >
                    {activeCat.types.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Si Immeuble → choix du nombre de niveaux */}
                {selectedTypeObj?.hasLevels && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Nombre de niveaux</label>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                      {['R+1', 'R+2', 'R+3', 'R+4', 'R+5'].map(level => {
                        const isLvlActive = formLevels === level
                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setFormLevels(level)}
                            style={{
                              padding: '8px 18px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                              fontWeight: 600, fontSize: 'var(--font-sm)',
                              border: isLvlActive ? '2px solid var(--accent-primary)' : '1.5px solid var(--border-color)',
                              background: isLvlActive ? 'rgba(59,130,246,0.1)' : 'var(--bg-secondary)',
                              color: isLvlActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {level}
                          </button>
                        )
                      })}
                    </div>
                    <small style={{ color: 'var(--text-muted)' }}>Sélectionnez le nombre d'étages de l'immeuble.</small>
                  </div>
                )}
              </>
            )
          })()}

          {/* ── Infos du bien ── */}
          <div className="grid-2">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Ville / Quartier</label>
              <input type="text" name="city" required defaultValue={editingProperty ? editingProperty.city : ''} placeholder="Ex: Dakar, Ngor" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Surface (m²)</label>
              <input type="number" name="surface" defaultValue={editingProperty ? editingProperty.surface : ''} placeholder="Ex: 85" min="0" />
            </div>
            {formType !== 'Local commercial' && formType !== 'Studio' && !formType.startsWith('Terrain') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Nombre de pièces</label>
                <input type="number" name="rooms" defaultValue={editingProperty ? editingProperty.rooms : ''} placeholder="Ex: 3" min="1" />
              </div>
            )}
            {/* Pour les terrains : choix entre location et vente */}
            {formType.startsWith('Terrain') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Type de transaction</label>
                <select
                  value={terrainTransaction}
                  onChange={e => setTerrainTransaction(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="location">Location (Loyer)</option>
                  <option value="vente">Vente (Prix)</option>
                </select>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>
                {formType.startsWith('Terrain')
                  ? (terrainTransaction === 'vente' ? 'Prix de vente (FCFA)' : 'Loyer mensuel (FCFA)')
                  : 'Loyer mensuel (FCFA)'}
              </label>
              <input type="text" name="price" defaultValue={editingProperty ? editingProperty.price : ''} placeholder="Ex: 350000" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Statut actuel</label>
              <select name="status" defaultValue={editingProperty ? editingProperty.status : 'Disponible'}>
                <option value="Disponible">Disponible</option>
                <option value="Loué">Loué</option>
                <option value="En travaux">En travaux</option>
              </select>
            </div>
            {formType === 'Colocation' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Capacité (colocation)</label>
                <input type="number" name="maxTenants" defaultValue={editingProperty ? editingProperty.maxTenants : 2} min="2" />
                <small style={{ color: 'var(--text-muted)' }}>Minimum 2 locataires pour une colocation.</small>
              </div>
            )}
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
