import { Tenant, Property, Payment } from '../models/index.js'
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
    const tenant = await Tenant.findByPk(req.params.id)
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
    const { propertyId } = req.body
    let propertyName = ''
    if (propertyId) {
      const property = await Property.findByPk(propertyId)
      if (property) {
        propertyName = property.title
        await property.update({
          status: 'Loué',
          tenantName: `${req.body.firstName} ${req.body.lastName}`,
        })
      }
    }
    const tenant = await Tenant.create({ ...req.body, propertyName })
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

    // Free the property
    if (tenant.propertyId) {
      const prop = await Property.findByPk(tenant.propertyId)
      if (prop) await prop.update({ status: 'Disponible', tenantName: null })
    }

    await tenant.destroy()
    res.json({ message: 'Locataire supprimé avec succès.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function settle(req, res) {
  try {
    const tenant = await Tenant.findByPk(req.params.id)
    if (!tenant) return res.status(404).json({ error: 'Locataire non trouvé.' })

    const [count] = await Payment.update(
      { status: 'Payé', method: req.body.method || 'Espèces', quittance: true },
      { where: { tenantId: tenant.id, status: 'En retard' } }
    )
    res.json({ message: `${count} paiement(s) réglé(s) pour ${tenant.firstName}.` })
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
