import { Tenant, Payment, Settings } from '../models/index.js'
import { Op } from 'sequelize'


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
      status: p.status,
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

// ======= PAYTECH: Étape 1 - Création de la facture et récupération de l'URL =======
export async function paytechInit(req, res) {
  try {
    const { token } = req.params
    const { amount } = req.body

    const tenant = await Tenant.findOne({ where: { token } })
    if (!tenant) return res.status(404).json({ error: 'Portail non trouvé.' })

    const currentMonth = new Date().toISOString().substring(0, 7)
    
    // On prépare le paiement dans notre BDD avec un statut en attente.
    let payment = await Payment.findOne({
      where: { tenantId: tenant.id, period: currentMonth, status: 'En retard' }
    })

    if (payment) {
      // S'il existe déjà un arriéré, on le met à jour
      await payment.update({ amount: amount || payment.amount })
    } else {
      // Sinon on crée une nouvelle instance de paiement
      payment = await Payment.create({
        tenantId: tenant.id,
        tenantName: `${tenant.firstName} ${tenant.lastName}`,
        propertyId: tenant.propertyId,
        propertyName: tenant.propertyName,
        amount: amount || tenant.rent,
        status: 'En attente',
        method: 'PayTech',
        date: new Date().toISOString().split('T')[0],
        quittance: false,
        period: currentMonth,
      })
    }

    // Préparation de la requête vers l'API PayTech
    const paytechUrl = process.env.PAYTECH_BASE_URL || 'https://paytech.sn/api/payment/request-payment'
    const paytechEnv = (process.env.PAYTECH_MODE || 'test').toLowerCase() === 'prod' ? 'prod' : 'test'
    const frontUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    const backUrl = process.env.BACKEND_PUBLIC_URL || 'http://localhost:5000'

    const payload = {
      item_name: `Loyer ${currentMonth}`,
      item_price: Number(payment.amount),
      ref_command: `LOYER-${payment.id}-${Date.now()}`,
      command_name: `Loyer de ${currentMonth} pour ${tenant.firstName} ${tenant.lastName}`,
      currency: process.env.PAYTECH_CURRENCY || 'XOF',
      env: paytechEnv,
      ipn_url: `${backUrl}/api/portal/paytech-webhook`,
      success_url: `${frontUrl}/locataire/${token}?payment=success`,
      cancel_url: `${frontUrl}/locataire/${token}?payment=cancel`,
      custom_field: JSON.stringify({
        payment_id: payment.id,
        tenant_id: tenant.id,
      }),
    }

    const response = await fetch(paytechUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        API_KEY: process.env.PAYTECH_API_KEY || '',
        API_SECRET: process.env.PAYTECH_API_SECRET || '',
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()

    const redirectUrl = data?.redirect_url || data?.redirectUrl
    if (data?.success === 1 && redirectUrl) {
      return res.json({ checkout_url: redirectUrl })
    }

    const paytechMessage =
      Array.isArray(data?.errors) && data.errors.length > 0
        ? data.errors.join(' | ')
        : data?.message || 'Erreur lors de la création du paiement PayTech.'
    return res.status(400).json({ error: paytechMessage, details: data })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// Compat temporaire avec ancien nom côté frontend.
export const paydunyaInit = paytechInit

// ======= PAYTECH: Étape 2 - Webhook IPN (Instant Payment Notification) =======
export async function paytechWebhook(req, res) {
  try {
    const ipnData = req.body || {}
    const event = String(ipnData.type_event || ipnData.event || ipnData.status || '').toLowerCase()
    const isSuccess = ['sale_complete', 'completed', 'success', 'paid'].includes(event)
    if (isSuccess) {
      let paymentId = ipnData.custom_data?.payment_id
      if (!paymentId && typeof ipnData.custom_field === 'string') {
        try {
          paymentId = JSON.parse(ipnData.custom_field)?.payment_id
        } catch (e) { /* ignore malformed custom_field */ }
      }
      if (paymentId) {
        const payment = await Payment.findByPk(paymentId)
        if (payment && payment.status !== 'Payé') {
          await payment.update({
            status: 'Payé',
            quittance: true,
            date: new Date().toISOString().split('T')[0]
          })
          console.log(`✅ [Webhook PayTech] Paiement #${payment.id} confirmé et marqué comme Payé.`)
        }
      }
    }

    res.status(200).send('Webhook OK')
  } catch (err) {
    console.error('Erreur Webhook PayTech:', err.message)
    res.status(500).send('Server Error')
  }
}

// Compat route historique
export const paydunyaWebhook = paytechWebhook

// (Facultatif) Permet de simuler un succès manuel si la webhook est bloquée
export async function verifyPaymentManual(req, res) {
  try {
    const { token } = req.params
    const tenant = await Tenant.findOne({ where: { token } })
    if (!tenant) return res.status(404).json({ error: 'Portail non trouvé.' })
    
    // On trouve le paiement en attente
    const payment = await Payment.findOne({
      where: {
        tenantId: tenant.id,
        status: { [Op.in]: ['En attente', 'En attente PayDunya'] },
      },
      order: [['id', 'DESC']]
    })

    if (payment) {
      await payment.update({ status: 'Payé', quittance: true })
      return res.json({ message: 'Paiement reconnu avec succès.', payment })
    }
    res.json({ message: 'Aucun paiement en attente.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
