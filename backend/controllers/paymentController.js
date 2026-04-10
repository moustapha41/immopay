import { Payment, Tenant, Settings, Notification } from '../models/index.js'
import { Op } from 'sequelize'
import { createInAppNotification, sendEventEmail, getOrCreateSettings } from '../services/notificationService.js'

export async function getAll(req, res) {
  try {
    const { status, search, month } = req.query
    const where = {}
    if (status && status !== 'Tous') where.status = status
    if (month) where.date = { [Op.gte]: `${month}-01`, [Op.lte]: `${month}-31` }
    if (search) {
      where[Op.or] = [
        { tenantName: { [Op.iLike]: `%${search}%` } },
        { propertyName: { [Op.iLike]: `%${search}%` } },
      ]
    }
    const payments = await Payment.findAll({ where, order: [['date', 'DESC']] })
    res.json(payments)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function create(req, res) {
  try {
    const payment = await Payment.create(req.body)
    const settings = await getOrCreateSettings()

    await createInAppNotification({
      type: 'paymentReceived',
      title: 'Paiement enregistré',
      message: `${payment.tenantName} a effectué un paiement de ${payment.amount} FCFA.`,
      metadata: {
        paymentId: payment.id,
        tenantId: payment.tenantId,
      },
    })

    const tenant = payment.tenantId ? await Tenant.findByPk(payment.tenantId) : null
    if (tenant?.email) {
      await sendEventEmail({
        settings,
        key: 'paymentReceived',
        to: tenant.email,
        subject: 'Confirmation de réception de paiement',
        text: `Bonjour ${tenant.firstName || ''}, nous confirmons la réception de votre paiement de ${payment.amount} FCFA pour le bien ${payment.propertyName}.`,
        html: `<p>Bonjour ${tenant.firstName || ''},</p><p>Nous confirmons la réception de votre paiement de <strong>${payment.amount} FCFA</strong> pour le bien <strong>${payment.propertyName}</strong>.</p>`,
        metadata: { paymentId: payment.id },
      })
    }

    res.status(201).json(payment)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function getQuittance(req, res) {
  try {
    const payment = await Payment.findByPk(req.params.id)
    if (!payment) return res.status(404).json({ error: 'Paiement non trouvé.' })

    const settings = await Settings.findOne()
    const agencyName = settings?.agencyName || 'ImmoSuite Sénégal'

    // Return JSON data for the frontend to generate the quittance
    res.json({
      payment,
      agencyName,
      logoUrl: settings?.logoUrl || null,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function generateQuittances(req, res) {
  try {
    const paidPayments = await Payment.findAll({
      where: { status: 'Payé', quittance: false },
    })

    await Payment.update({ quittance: true }, {
      where: { status: 'Payé', quittance: false },
    })

    const settings = await Settings.findOne()
    res.json({
      count: paidPayments.length,
      payments: paidPayments,
      agencyName: settings?.agencyName || 'ImmoSuite Sénégal',
      logoUrl: settings?.logoUrl || null,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function sendRelances(req, res) {
  try {
    const settings = await getOrCreateSettings()
    const unpaid = await Payment.findAll({
      where: { status: 'En retard' },
    })

    let sentEmails = 0
    for (const p of unpaid) {
      console.log(`[RELANCE] Envoi relance à ${p.tenantName} pour ${p.propertyName} — ${p.amount} FCFA`)
      await createInAppNotification({
        type: 'latePayment',
        title: 'Relance de paiement',
        message: `Relance envoyée à ${p.tenantName} pour ${p.propertyName} (${p.amount} FCFA).`,
        metadata: { paymentId: p.id, tenantId: p.tenantId },
      })

      const tenant = p.tenantId ? await Tenant.findByPk(p.tenantId) : null
      if (tenant?.email) {
        const result = await sendEventEmail({
          settings,
          key: 'latePayment',
          to: tenant.email,
          subject: 'Relance de paiement de loyer',
          text: `Bonjour ${tenant.firstName || ''}, votre loyer de ${p.amount} FCFA pour ${p.propertyName} est en retard. Merci de regulariser votre situation.`,
          html: `<p>Bonjour ${tenant.firstName || ''},</p><p>Votre loyer de <strong>${p.amount} FCFA</strong> pour <strong>${p.propertyName}</strong> est en retard.</p><p>Merci de régulariser votre situation dès que possible.</p>`,
          metadata: { paymentId: p.id, tenantId: p.tenantId },
        })
        if (!result.skipped) sentEmails += 1
      }
    }

    res.json({
      message: `${unpaid.length} relance(s) traitée(s), ${sentEmails} email(s) envoyé(s).`,
      count: unpaid.length,
      sentEmails,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function exportPayments(req, res) {
  try {
    const payments = await Payment.findAll({ order: [['date', 'DESC']] })
    const settings = await Settings.findOne()
    res.json({
      payments,
      agencyName: settings?.agencyName || 'ImmoSuite Sénégal',
      logoUrl: settings?.logoUrl || null,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function getRelancesHistory(req, res) {
  try {
    const relances = await Notification.findAll({
      where: { type: 'latePayment' },
      order: [['createdAt', 'DESC']],
      limit: 50,
    })
    res.json(relances)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
