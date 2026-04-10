import { Charge, Property, Tenant } from '../models/index.js'
import { Op } from 'sequelize'

export async function getAll(req, res) {
  try {
    const { category, search } = req.query
    const where = {}
    if (category) where.category = category
    if (search) {
      where[Op.or] = [
        { label: { [Op.iLike]: `%${search}%` } },
        { propertyName: { [Op.iLike]: `%${search}%` } },
      ]
    }
    const charges = await Charge.findAll({ where, order: [['id', 'DESC']] })
    res.json(charges)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function create(req, res) {
  try {
    const { propertyId, category } = req.body
    let propertyName = 'Tous les biens'
    let tenantName = ''
    let tenantId = null

    if (propertyId && propertyId !== 'all') {
      const property = await Property.findByPk(propertyId)
      if (property) propertyName = property.title

      if (category === 'tenant') {
        const tenant = await Tenant.findOne({ where: { propertyId } })
        if (tenant) {
          tenantName = `${tenant.firstName} ${tenant.lastName}`
          tenantId = tenant.id
        }
      }
    }

    const charge = await Charge.create({
      ...req.body,
      propertyName,
      tenantName,
      tenantId,
      propertyId: propertyId === 'all' ? null : propertyId,
    })
    res.status(201).json(charge)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function update(req, res) {
  try {
    const charge = await Charge.findByPk(req.params.id)
    if (!charge) return res.status(404).json({ error: 'Charge non trouvée.' })
    await charge.update(req.body)
    res.json(charge)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function settle(req, res) {
  try {
    const charge = await Charge.findByPk(req.params.id)
    if (!charge) return res.status(404).json({ error: 'Charge non trouvée.' })

    const newStatus = charge.category === 'tenant' ? 'Régularisé' : 'Payé'
    await charge.update({ status: newStatus })
    res.json(charge)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function remove(req, res) {
  try {
    const charge = await Charge.findByPk(req.params.id)
    if (!charge) return res.status(404).json({ error: 'Charge non trouvée.' })
    await charge.destroy()
    res.json({ message: 'Charge supprimée.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
