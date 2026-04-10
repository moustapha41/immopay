import { Prospect, Tenant, Property } from '../models/index.js'
import { Op } from 'sequelize'
import { createInAppNotification, sendEventEmail, getOrCreateSettings } from '../services/notificationService.js'

export async function getAll(req, res) {
  try {
    const { search, status } = req.query
    const where = {}
    if (status && status !== 'Tous') where.status = status
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { interest: { [Op.iLike]: `%${search}%` } },
      ]
    }
    const prospects = await Prospect.findAll({ where, order: [['id', 'DESC']] })
    res.json(prospects)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function create(req, res) {
  try {
    const prospect = await Prospect.create({
      ...req.body,
      score: req.body.score || Math.floor(Math.random() * 40) + 60,
      date: req.body.date || new Date().toISOString().split('T')[0],
    })

    const settings = await getOrCreateSettings()
    await createInAppNotification({
      type: 'newProspect',
      title: 'Nouveau prospect',
      message: `${prospect.name} a été ajouté dans le pipeline CRM.`,
      metadata: { prospectId: prospect.id },
    })

    const adminReceiver = process.env.NOTIFICATION_EMAIL_TO || process.env.RESEND_FROM_EMAIL
    if (adminReceiver) {
      await sendEventEmail({
        settings,
        key: 'newProspect',
        to: adminReceiver,
        subject: 'Nouveau prospect enregistre',
        text: `Un nouveau prospect a été ajouté: ${prospect.name} (${prospect.email || 'sans email'}) - intérêt: ${prospect.interest || 'N/A'}.`,
        html: `<p>Un nouveau prospect a été ajouté :</p><ul><li><strong>Nom:</strong> ${prospect.name}</li><li><strong>Email:</strong> ${prospect.email || 'N/A'}</li><li><strong>Téléphone:</strong> ${prospect.phone || 'N/A'}</li><li><strong>Intérêt:</strong> ${prospect.interest || 'N/A'}</li></ul>`,
        metadata: { prospectId: prospect.id },
      })
    }

    res.status(201).json(prospect)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function update(req, res) {
  try {
    const prospect = await Prospect.findByPk(req.params.id)
    if (!prospect) return res.status(404).json({ error: 'Prospect non trouvé.' })
    await prospect.update(req.body)
    res.json(prospect)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function advance(req, res) {
  try {
    const prospect = await Prospect.findByPk(req.params.id)
    if (!prospect) return res.status(404).json({ error: 'Prospect non trouvé.' })

    const pipeline = ['Nouveau', 'Contact', 'Visite', 'Offre', 'Signé']
    const currentIdx = pipeline.indexOf(prospect.status)
    if (currentIdx < pipeline.length - 1) {
      await prospect.update({ status: pipeline[currentIdx + 1] })
    }
    res.json(prospect)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function convert(req, res) {
  try {
    const prospect = await Prospect.findByPk(req.params.id)
    if (!prospect) return res.status(404).json({ error: 'Prospect non trouvé.' })

    const nameParts = prospect.name.split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    const tenant = await Tenant.create({
      firstName,
      lastName,
      phone: prospect.phone,
      email: prospect.email,
      rent: 0,
      depositAmount: 0,
      status: 'Actif',
    })

    await prospect.destroy()
    res.json({ message: `${prospect.name} converti en locataire.`, tenant })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function remove(req, res) {
  try {
    const prospect = await Prospect.findByPk(req.params.id)
    if (!prospect) return res.status(404).json({ error: 'Prospect non trouvé.' })
    await prospect.destroy()
    res.json({ message: 'Prospect supprimé.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
