import { Property, Tenant, Lease } from '../models/index.js'
import { Op } from 'sequelize'

// ==================== Helper: recalcule le statut d'un bien parent ====================
export async function recalculateParentStatus(parentId) {
  if (!parentId) return
  const parent = await Property.findByPk(parentId)
  if (!parent) return

  const children = await Property.findAll({ where: { parentId } })
  if (children.length === 0) return

  const allStatuses = children.map(c => c.status)
  const allOccupied = allStatuses.every(s => s === 'Loué' || s === 'Complet')
  const noneOccupied = allStatuses.every(s => s === 'Disponible' || s === 'En travaux')

  let newStatus
  if (allOccupied) {
    newStatus = 'Complet'
  } else if (noneOccupied) {
    newStatus = 'Disponible'
  } else {
    newStatus = 'Partiellement Loué'
  }

  if (parent.status !== newStatus) {
    await parent.update({ status: newStatus })
  }
}

// ==================== Helper: recalcule le statut d'un bien enfant ====================
export async function recalculateUnitStatus(propertyId) {
  if (!propertyId) return
  const property = await Property.findByPk(propertyId)
  if (!property) return

  // Compter les baux actifs sur cette unité
  const activeLeaseCount = await Lease.count({
    where: { propertyId, status: 'Actif' }
  })

  let newStatus

  // Pour les Immeubles : calcul basé sur les étages loués
  if (property.type === 'Immeuble') {
    // Extraire le nombre d'étages depuis le titre (ex: "Immeuble R+3" -> 4 étages total avec RDC)
    const levelsMatch = (property.title || '').match(/R\+(\d)/)
    const totalFloors = levelsMatch ? parseInt(levelsMatch[1]) + 1 : property.maxTenants // +1 pour RDC

    if (activeLeaseCount === 0) {
      newStatus = 'Disponible'
    } else if (activeLeaseCount >= totalFloors) {
      newStatus = 'Complet'
    } else {
      newStatus = 'Partiellement Loué'
    }
  } else if (property.type === 'Colocation') {
    // Pour les colocations : Partiellement Loué si pas complet
    if (activeLeaseCount === 0) {
      newStatus = 'Disponible'
    } else if (activeLeaseCount >= property.maxTenants) {
      newStatus = 'Complet'
    } else {
      newStatus = 'Partiellement Loué'
    }
  } else {
    // Pour les autres biens
    if (activeLeaseCount === 0) {
      newStatus = 'Disponible'
    } else if (activeLeaseCount >= property.maxTenants) {
      newStatus = 'Loué'
    } else {
      newStatus = 'Partiellement Loué'
    }

    // Pour les biens simples (maxTenants = 1), pas de "Partiellement Loué"
    if (property.maxTenants === 1 && activeLeaseCount > 0) {
      newStatus = 'Loué'
    }
  }

  // Collecter les noms des locataires actifs
  const activeLeases = await Lease.findAll({
    where: { propertyId, status: 'Actif' },
    include: [{ model: Tenant, as: 'tenant', attributes: ['firstName', 'lastName'] }]
  })
  const tenantNames = activeLeases
    .map(l => l.tenant ? `${l.tenant.firstName} ${l.tenant.lastName}` : '')
    .filter(Boolean)
    .join(', ')

  await property.update({
    status: newStatus,
    tenantName: tenantNames || null,
  })

  // Cascade vers le parent s'il existe
  if (property.parentId) {
    await recalculateParentStatus(property.parentId)
  }
}

// ==================== GET ALL ====================
export async function getAll(req, res) {
  try {
    const { status, city, type, search, parentId, rootOnly } = req.query
    const where = {}
    if (status && status !== 'Tous') where.status = status
    if (city) where.city = city
    if (type) where.type = type
    if (parentId) where.parentId = parentId
    if (rootOnly === 'true') where.parentId = null
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { city: { [Op.iLike]: `%${search}%` } },
        { address: { [Op.iLike]: `%${search}%` } },
      ]
    }
    const properties = await Property.findAll({
      where,
      include: [
        { model: Property, as: 'children', required: false },
      ],
      order: [['id', 'DESC']],
    })
    res.json(properties)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ==================== GET BY ID (avec enfants et baux) ====================
export async function getById(req, res) {
  try {
    const property = await Property.findByPk(req.params.id, {
      include: [
        {
          model: Property, as: 'children',
          include: [
            { model: Lease, as: 'leases', where: { status: 'Actif' }, required: false,
              include: [{ model: Tenant, as: 'tenant', attributes: ['id', 'firstName', 'lastName', 'phone', 'email'] }]
            }
          ]
        },
        { model: Property, as: 'parent', required: false },
        {
          model: Lease, as: 'leases', required: false,
          include: [{ model: Tenant, as: 'tenant', attributes: ['id', 'firstName', 'lastName', 'phone', 'email'] }]
        },
      ],
    })
    if (!property) return res.status(404).json({ error: 'Bien non trouvé.' })
    res.json(property)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ==================== CREATE ====================
export async function create(req, res) {
  try {
    const property = await Property.create(req.body)

    // Si c'est un enfant, recalculer le parent
    if (property.parentId) {
      await recalculateParentStatus(property.parentId)
    }

    // Re-fetch avec les includes
    const full = await Property.findByPk(property.id, {
      include: [{ model: Property, as: 'children', required: false }],
    })
    res.status(201).json(full)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ==================== UPDATE ====================
export async function update(req, res) {
  try {
    const property = await Property.findByPk(req.params.id)
    if (!property) return res.status(404).json({ error: 'Bien non trouvé.' })
    const oldParentId = property.parentId
    await property.update(req.body)

    // Si le parent a changé, recalculer les deux
    if (oldParentId !== property.parentId) {
      if (oldParentId) await recalculateParentStatus(oldParentId)
      if (property.parentId) await recalculateParentStatus(property.parentId)
    }

    const full = await Property.findByPk(property.id, {
      include: [{ model: Property, as: 'children', required: false }],
    })
    res.json(full)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ==================== DELETE (protégé) ====================
export async function remove(req, res) {
  try {
    const property = await Property.findByPk(req.params.id, {
      include: [{ model: Property, as: 'children', required: false }],
    })
    if (!property) return res.status(404).json({ error: 'Bien non trouvé.' })

    // Protection : vérifier les baux actifs sur cette unité
    const activeLeasesCount = await Lease.count({
      where: { propertyId: property.id, status: 'Actif' }
    })
    if (activeLeasesCount > 0) {
      return res.status(400).json({
        error: `Impossible de supprimer ce bien : ${activeLeasesCount} bail(s) actif(s) en cours. Veuillez d'abord résilier tous les baux avant de supprimer cette unité.`
      })
    }

    // Protection : vérifier les enfants avec baux actifs
    if (property.children && property.children.length > 0) {
      const childIds = property.children.map(c => c.id)
      const childActiveLeasesCount = await Lease.count({
        where: { propertyId: { [Op.in]: childIds }, status: 'Actif' }
      })
      if (childActiveLeasesCount > 0) {
        return res.status(400).json({
          error: `Impossible de supprimer cet immeuble : ${childActiveLeasesCount} bail(s) actif(s) sur ses unités enfants. Veuillez d'abord résilier tous les baux.`
        })
      }
      // Supprimer tous les enfants
      await Property.destroy({ where: { parentId: property.id } })
    }

    const parentId = property.parentId
    await property.destroy()

    // Recalculer le parent
    if (parentId) {
      await recalculateParentStatus(parentId)
    }

    res.json({ message: 'Bien supprimé avec succès.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ==================== GET UNITS D'UN PARENT ====================
export async function getChildren(req, res) {
  try {
    const children = await Property.findAll({
      where: { parentId: req.params.id },
      include: [
        {
          model: Lease, as: 'leases', where: { status: 'Actif' }, required: false,
          include: [{ model: Tenant, as: 'tenant', attributes: ['id', 'firstName', 'lastName', 'phone'] }]
        },
      ],
      order: [['title', 'ASC']],
    })
    res.json(children)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ==================== GET OCCUPANCY INFO (étages loués, capacité, etc.) ====================
export async function getOccupancy(req, res) {
  try {
    const property = await Property.findByPk(req.params.id)
    if (!property) return res.status(404).json({ error: 'Bien non trouvé.' })

    const activeLeases = await Lease.findAll({
      where: { propertyId: property.id, status: 'Actif' },
      include: [{ model: Tenant, as: 'tenant', attributes: ['id', 'firstName', 'lastName'] }]
    })

    let totalUnits = property.maxTenants || 1
    let occupiedFloors = []

    if (property.type === 'Immeuble') {
      // Calcul des étages depuis le titre (ex: "Immeuble R+3" → 4 étages total avec RDC)
      const levelsMatch = (property.title || '').match(/R\+(\d+)/)
      totalUnits = levelsMatch ? parseInt(levelsMatch[1]) + 1 : property.maxTenants
      occupiedFloors = activeLeases.filter(l => l.floor).map(l => l.floor)
    }

    const occupiedCount = activeLeases.length
    const availableCount = Math.max(0, totalUnits - occupiedCount)

    res.json({
      propertyId: property.id,
      type: property.type,
      status: property.status,
      totalUnits,
      occupiedCount,
      availableCount,
      occupiedFloors,
      activeLeases: activeLeases.map(l => ({
        id: l.id,
        floor: l.floor,
        tenant: l.tenant ? `${l.tenant.firstName} ${l.tenant.lastName}` : null,
      })),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
