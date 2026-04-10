import { Tenant, Payment, Settings } from '../models/index.js'

export async function getPortalData(req, res) {
  try {
    const { token } = req.params
    const tenant = await Tenant.findOne({ where: { token } })
    if (!tenant) return res.status(404).json({ error: 'Portail non trouvé. Vérifiez votre lien.' })

    const payments = await Payment.findAll({
      where: { tenantId: tenant.id },
      order: [['date', 'DESC']],
    })

    // Calculate balances
    const currentMonth = new Date().toISOString().substring(0, 7) // "2026-04"
    const currentMonthPayments = payments.filter(p => p.date && p.date.toString().startsWith(currentMonth))
    const montantPaye = currentMonthPayments
      .filter(p => p.status === 'Payé')
      .reduce((sum, p) => sum + p.amount, 0)

    const totalAttendu = tenant.rent
    const resteAPayer = Math.max(0, totalAttendu - montantPaye)

    // Build history
    const history = payments.slice(0, 12).map(p => ({
      month: new Date(p.date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      status: p.status === 'Payé' ? 'Complet' : p.status === 'En retard' ? 'En retard' : 'Partiel',
      amount: p.amount,
      total: tenant.rent,
      date: p.date,
      method: p.method,
    }))

    res.json({
      name: `${tenant.firstName} ${tenant.lastName}`,
      property: tenant.propertyName,
      address: '',
      loyerDeBase: tenant.rent,
      charges: 0,
      totalAttendu,
      montantPaye,
      resteAPayer,
      history,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function portalPay(req, res) {
  try {
    const { token } = req.params
    const { amount, method } = req.body

    const tenant = await Tenant.findOne({ where: { token } })
    if (!tenant) return res.status(404).json({ error: 'Portail non trouvé.' })

    const currentMonth = new Date().toISOString().substring(0, 7)

    // Chercher si un paiement impayé existe déjà pour ce mois
    let existingPayment = await Payment.findOne({
      where: {
        tenantId: tenant.id,
        period: currentMonth,
        status: 'En retard'
      }
    })

    let payment
    if (existingPayment) {
      // Mettre à jour le paiement existant
      await existingPayment.update({
        status: 'Payé',
        method: method || 'PayDunya',
        quittance: true,
      })
      payment = existingPayment
    } else {
      // Créer un nouveau paiement
      payment = await Payment.create({
        tenantId: tenant.id,
        tenantName: `${tenant.firstName} ${tenant.lastName}`,
        propertyId: tenant.propertyId,
        propertyName: tenant.propertyName,
        amount: amount || tenant.rent,
        status: 'Payé',
        method: method || 'PayDunya',
        date: new Date().toISOString().split('T')[0],
        quittance: true,
        period: currentMonth,
      })
    }

    res.json({ message: 'Paiement enregistré avec succès.', payment })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
