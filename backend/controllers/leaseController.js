import { Lease, Tenant, Property } from '../models/index.js'
import { recalculateUnitStatus } from './propertyController.js'
import { Op } from 'sequelize'

// ==================== GET ALL LEASES ====================
export async function getAll(req, res) {
  try {
    const { status, propertyId, tenantId } = req.query
    const where = {}
    if (status && status !== 'Tous') where.status = status
    if (propertyId) where.propertyId = propertyId
    if (tenantId) where.tenantId = tenantId

    const leases = await Lease.findAll({
      where,
      include: [
        { model: Tenant, as: 'tenant', attributes: ['id', 'firstName', 'lastName', 'phone', 'email'] },
        { model: Property, as: 'property', attributes: ['id', 'title', 'type', 'address', 'city'] },
      ],
      order: [['id', 'DESC']],
    })
    res.json(leases)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ==================== GET LEASE BY ID ====================
export async function getById(req, res) {
  try {
    const lease = await Lease.findByPk(req.params.id, {
      include: [
        { model: Tenant, as: 'tenant' },
        { model: Property, as: 'property' },
      ],
    })
    if (!lease) return res.status(404).json({ error: 'Bail non trouvé.' })
    res.json(lease)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ==================== CREATE LEASE ====================
export async function create(req, res) {
  try {
    const { tenantId, propertyId, rent, startDate, endDate, depositAmount, floor } = req.body

    // Vérifier que le locataire existe
    const tenant = await Tenant.findByPk(tenantId)
    if (!tenant) return res.status(404).json({ error: 'Locataire non trouvé.' })

    // Vérifier que le bien existe
    const property = await Property.findByPk(propertyId)
    if (!property) return res.status(404).json({ error: 'Bien non trouvé.' })

    // Vérifier que le bien n'est pas déjà Loué ou Complet
    if (property.status === 'Loué' || property.status === 'Complet') {
      return res.status(400).json({
        error: `Ce bien est déjà ${property.status.toLowerCase()}. Aucun bail ne peut être créé.`
      })
    }

    // Vérifier la capacité (maxTenants)
    const activeLeaseCount = await Lease.count({
      where: { propertyId, status: 'Actif' }
    })
    if (activeLeaseCount >= property.maxTenants) {
      return res.status(400).json({
        error: `Ce bien a atteint sa capacité maximale (${property.maxTenants} locataire(s)). Aucun bail supplémentaire ne peut être créé.`
      })
    }

    // Pour les immeubles, vérifier que l'étage n'est pas déjà loué
    if (property.type === 'Immeuble' && floor) {
      const existingFloorLease = await Lease.findOne({
        where: { propertyId, floor, status: 'Actif' }
      })
      if (existingFloorLease) {
        return res.status(400).json({
          error: `L'étage ${floor} est déjà loué.`
        })
      }
    }

    // Vérifier que ce locataire n'a pas déjà un bail actif sur ce même bien
    const existingLease = await Lease.findOne({
      where: { tenantId, propertyId, status: 'Actif' }
    })
    if (existingLease) {
      return res.status(400).json({
        error: 'Ce locataire a déjà un bail actif sur ce bien.'
      })
    }

    // Créer le bail
    const lease = await Lease.create({
      tenantId,
      propertyId,
      rent: rent || 0,
      startDate,
      endDate: endDate || null,
      depositAmount: depositAmount || 0,
      floor: floor || null,
    })

    // Mettre à jour le champ legacy propertyId sur le locataire (rétrocompatibilité)
    await tenant.update({
      propertyId,
      propertyName: property.title,
      rent: rent || tenant.rent,
      dateEntree: startDate,
      dateFinBail: endDate || null,
      depositAmount: depositAmount || tenant.depositAmount,
    })

    // Recalculer le statut du bien
    await recalculateUnitStatus(propertyId)

    // Re-fetch avec includes
    const full = await Lease.findByPk(lease.id, {
      include: [
        { model: Tenant, as: 'tenant', attributes: ['id', 'firstName', 'lastName', 'phone', 'email'] },
        { model: Property, as: 'property', attributes: ['id', 'title', 'type', 'address', 'city'] },
      ],
    })

    res.status(201).json(full)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ==================== UPDATE LEASE ====================
export async function update(req, res) {
  try {
    const lease = await Lease.findByPk(req.params.id)
    if (!lease) return res.status(404).json({ error: 'Bail non trouvé.' })

    await lease.update(req.body)

    // Recalculer le statut du bien
    await recalculateUnitStatus(lease.propertyId)

    const full = await Lease.findByPk(lease.id, {
      include: [
        { model: Tenant, as: 'tenant', attributes: ['id', 'firstName', 'lastName', 'phone', 'email'] },
        { model: Property, as: 'property', attributes: ['id', 'title', 'type', 'address', 'city'] },
      ],
    })
    res.json(full)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ==================== TERMINATE LEASE (Résilier) ====================
export async function terminate(req, res) {
  try {
    const lease = await Lease.findByPk(req.params.id)
    if (!lease) return res.status(404).json({ error: 'Bail non trouvé.' })
    if (lease.status !== 'Actif') {
      return res.status(400).json({ error: 'Ce bail n\'est pas actif.' })
    }

    await lease.update({ status: 'Résilié', endDate: new Date().toISOString().split('T')[0] })

    // Vérifier si c'est le dernier bail actif du locataire → libérer le legacy field
    const otherActiveLeases = await Lease.count({
      where: { tenantId: lease.tenantId, status: 'Actif' }
    })
    if (otherActiveLeases === 0) {
      await Tenant.update(
        { propertyId: null, propertyName: '' },
        { where: { id: lease.tenantId } }
      )
    }

    // Recalculer le statut du bien
    await recalculateUnitStatus(lease.propertyId)

    res.json({ message: 'Bail résilié avec succès.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ==================== DELETE LEASE ====================
export async function remove(req, res) {
  try {
    const lease = await Lease.findByPk(req.params.id)
    if (!lease) return res.status(404).json({ error: 'Bail non trouvé.' })

    if (lease.status === 'Actif') {
      return res.status(400).json({
        error: 'Impossible de supprimer un bail actif. Veuillez d\'abord le résilier.'
      })
    }

    const propertyId = lease.propertyId
    await lease.destroy()

    await recalculateUnitStatus(propertyId)

    res.json({ message: 'Bail supprimé avec succès.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
