import { Property, Tenant } from '../models/index.js'
import { Op } from 'sequelize'

export async function getAll(req, res) {
  try {
    const { status, city, type, search } = req.query
    const where = {}
    if (status && status !== 'Tous') where.status = status
    if (city) where.city = city
    if (type) where.type = type
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { city: { [Op.iLike]: `%${search}%` } },
        { address: { [Op.iLike]: `%${search}%` } },
      ]
    }
    const properties = await Property.findAll({ where, order: [['id', 'DESC']] })
    res.json(properties)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function getById(req, res) {
  try {
    const property = await Property.findByPk(req.params.id)
    if (!property) return res.status(404).json({ error: 'Bien non trouvé.' })
    res.json(property)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function create(req, res) {
  try {
    const property = await Property.create(req.body)
    res.status(201).json(property)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function update(req, res) {
  try {
    const property = await Property.findByPk(req.params.id)
    if (!property) return res.status(404).json({ error: 'Bien non trouvé.' })
    await property.update(req.body)
    res.json(property)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function remove(req, res) {
  try {
    const property = await Property.findByPk(req.params.id)
    if (!property) return res.status(404).json({ error: 'Bien non trouvé.' })
    await property.destroy()
    res.json({ message: 'Bien supprimé avec succès.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
