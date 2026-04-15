import { Settings, Property, Tenant, Prospect, Payment, Charge, Notification, Account, JournalEntry, Lease } from '../models/index.js'

export async function getSettings(req, res) {
  try {
    let settings = await Settings.findOne()
    if (!settings) {
      settings = await Settings.create({})
    }
    res.json(settings)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function updateSettings(req, res) {
  try {
    let settings = await Settings.findOne()
    if (!settings) {
      settings = await Settings.create(req.body)
    } else {
      await settings.update(req.body)
    }
    res.json(settings)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function uploadLogo(req, res) {
  try {
    if (!req.body.logoUrl) {
      return res.status(400).json({ error: 'Aucune image fournie.' })
    }

    let settings = await Settings.findOne()
    if (!settings) {
      settings = await Settings.create({ logoUrl: req.body.logoUrl })
    } else {
      await settings.update({ logoUrl: req.body.logoUrl })
    }
    res.json({ logoUrl: settings.logoUrl })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function resetSystem(req, res) {
  try {
    // Vider les tables métiers
    await Notification.destroy({ where: {} })
    await JournalEntry.destroy({ where: {} })
    await Account.destroy({ where: {} })
    await Payment.destroy({ where: {} })
    await Charge.destroy({ where: {} })
    await Lease.destroy({ where: {} })
    await Prospect.destroy({ where: {} })
    await Tenant.destroy({ where: {} })
    await Property.destroy({ where: {} })
    
    res.json({ message: 'Système réinitialisé avec succès !' })
  } catch (err) {
    console.error('Erreur lors du reset système:', err)
    res.status(500).json({ error: err.message || 'Erreur lors du reset système' })
  }
}
