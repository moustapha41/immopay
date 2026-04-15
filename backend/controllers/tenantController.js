import { Tenant, Property, Payment, Lease } from '../models/index.js'
import { recalculateUnitStatus } from './propertyController.js'
import { Op, Sequelize } from 'sequelize'

export async function getAll(req, res) {
  try {
    const { search } = req.query
    const where = {}
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { propertyName: { [Op.iLike]: `%${search}%` } },
      ]
    }
    const tenants = await Tenant.findAll({ where, order: [['id', 'DESC']] })
    res.json(tenants)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function getById(req, res) {
  try {
    const tenant = await Tenant.findByPk(req.params.id, {
      include: [
        {
          model: Lease,
          as: 'leases',
          include: [{ model: Property, as: 'property' }]
        }
      ]
    })
    if (!tenant) return res.status(404).json({ error: 'Locataire non trouvé.' })

    const payments = await Payment.findAll({
      where: { tenantId: tenant.id },
      order: [['date', 'DESC']],
    })
    res.json({ ...tenant.toJSON(), paymentHistory: payments })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function create(req, res) {
  try {
    const { propertyId, floor } = req.body
    let propertyName = ''

    if (propertyId) {
      const property = await Property.findByPk(propertyId)
      if (!property) return res.status(404).json({ error: 'Bien non trouvé.' })

      propertyName = property.title

      // ── Vérifier si le bien est déjà Loué ou Complet ──
      if (property.status === 'Loué' || property.status === 'Complet') {
        return res.status(400).json({
          error: `Ce bien est déjà ${property.status.toLowerCase()}. Impossible de créer un nouveau locataire.`
        })
      }

      // ── Pour les Immeubles : vérifier l'étage ──
      if (property.type === 'Immeuble') {
        if (!floor) {
          return res.status(400).json({
            error: 'Veuillez sélectionner un étage pour cet immeuble.'
          })
        }
        // Vérifier que l'étage n'est pas déjà loué
        const existingFloorLease = await Lease.findOne({
          where: { propertyId, floor, status: 'Actif' }
        })
        if (existingFloorLease) {
          return res.status(400).json({
            error: `L'étage ${floor} est déjà loué.`
          })
        }
      }

      // ── Pour les Colocations : vérifier la capacité ──
      if (property.type === 'Colocation') {
        const activeLeaseCount = await Lease.count({
          where: { propertyId, status: 'Actif' }
        })
        if (activeLeaseCount >= property.maxTenants) {
          return res.status(400).json({
            error: `Cette colocation a atteint sa capacité maximale (${property.maxTenants} locataire(s)).`
          })
        }
      }

      // ── Pour les biens simples : vérifier si pas déjà un bail actif ──
      if (property.type !== 'Immeuble' && property.type !== 'Colocation') {
        const activeLeaseCount = await Lease.count({
          where: { propertyId, status: 'Actif' }
        })
        if (activeLeaseCount >= property.maxTenants) {
          return res.status(400).json({
            error: `Ce bien a atteint sa capacité maximale.`
          })
        }
      }
    }

    // ── Créer le locataire ──
    const tenant = await Tenant.create({ ...req.body, propertyName })

    // ── Créer automatiquement un bail ──
    if (propertyId) {
      await Lease.create({
        tenantId: tenant.id,
        propertyId,
        rent: req.body.rent || 0,
        startDate: req.body.dateEntree || new Date().toISOString().split('T')[0],
        endDate: req.body.dateFinBail || null,
        depositAmount: req.body.depositAmount || 0,
        floor: floor || null,
      })

      // ── Recalculer le statut du bien (Loué, Partiellement Loué, Complet) ──
      await recalculateUnitStatus(propertyId)
    }

    res.status(201).json(tenant)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function update(req, res) {
  try {
    const tenant = await Tenant.findByPk(req.params.id)
    if (!tenant) return res.status(404).json({ error: 'Locataire non trouvé.' })
    await tenant.update(req.body)
    res.json(tenant)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function remove(req, res) {
  try {
    const tenant = await Tenant.findByPk(req.params.id)
    if (!tenant) return res.status(404).json({ error: 'Locataire non trouvé.' })

    // Résilier tous les baux actifs du locataire
    const activeLeases = await Lease.findAll({
      where: { tenantId: tenant.id, status: 'Actif' }
    })
    const propertyIds = []
    for (const lease of activeLeases) {
      await lease.update({ status: 'Résilié', endDate: new Date().toISOString().split('T')[0] })
      if (!propertyIds.includes(lease.propertyId)) {
        propertyIds.push(lease.propertyId)
      }
    }

    await tenant.destroy()

    // Recalculer le statut de chaque bien concerné
    for (const propId of propertyIds) {
      await recalculateUnitStatus(propId)
    }

    res.json({ message: 'Locataire supprimé avec succès.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function settle(req, res) {
  try {
    const tenant = await Tenant.findByPk(req.params.id)
    if (!tenant) return res.status(404).json({ error: 'Locataire non trouvé.' })

    const amountPaid = parseInt(req.body.amountPaid)

    if (amountPaid) {
      let payment = await Payment.findOne({
        where: { tenantId: tenant.id, status: { [Op.in]: ['En retard', 'Partiel'] } },
        order: [['date', 'ASC']]
      })

      if (!payment) return res.status(400).json({ error: 'Aucun paiement en attente.' })

      const actualPaid = (payment.amountPaid || 0) + amountPaid
      let newStatus = 'Partiel'
      if (actualPaid >= payment.amount) {
        newStatus = 'Payé'
      }

      await payment.update({
        amountPaid: actualPaid,
        status: newStatus,
        method: req.body.method || 'Espèces',
        quittance: newStatus === 'Payé'
      })

      return res.json({ message: `Paiement ${newStatus} enregistré pour ${tenant.firstName}.` })
    } else {
      const payments = await Payment.findAll({ where: { tenantId: tenant.id, status: { [Op.in]: ['En retard', 'Partiel'] } } })
      let count = 0
      for (const p of payments) {
        await p.update({
          status: 'Payé',
          amountPaid: p.amount,
          method: req.body.method || 'Espèces',
          quittance: true
        })
        count++
      }
      res.json({ message: `${count} paiement(s) réglé(s) pour ${tenant.firstName}.` })
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// Fonction pour créer automatiquement les loyers mensuels impayés
export async function generateMonthlyPayments(req, res) {
  try {
    const today = new Date()
    const currentDay = today.getDate()
    const currentMonth = today.toISOString().slice(0, 7) // YYYY-MM

    // Récupérer tous les locataires actifs avec dateEntree
    const tenants = await Tenant.findAll({
      where: {
        status: 'Actif',
        dateEntree: { [Op.not]: null }
      }
    })

    let createdCount = 0

    for (const tenant of tenants) {
      const entryDate = new Date(tenant.dateEntree)
      const entryDay = entryDate.getDate()

      // Vérifier si aujourd'hui est le jour d'entrée du locataire
      if (currentDay === entryDay) {
        // Vérifier si un paiement existe déjà pour ce mois
        const existingPayment = await Payment.findOne({
          where: {
            tenantId: tenant.id,
            period: currentMonth
          }
        })

        if (!existingPayment) {
          // Créer un paiement impayé pour ce mois
          await Payment.create({
            tenantId: tenant.id,
            tenantName: `${tenant.firstName} ${tenant.lastName}`,
            propertyId: tenant.propertyId,
            propertyName: tenant.propertyName || '',
            amount: tenant.rent,
            date: today.toISOString().split('T')[0],
            status: 'En retard',
            method: '-',
            period: currentMonth,
          })
          createdCount++
        }
      }
    }

    res.json({
      message: `${createdCount} loyer(s) mensuel(s) créé(s) comme impayé(s).`,
      date: today.toISOString(),
      createdCount
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
