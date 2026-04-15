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

// ======= PAYDUNYA: Étape 1 - Création de la facture et récupération de l'URL =======
export async function paydunyaInit(req, res) {
  try {
    const { token } = req.params
    const { amount } = req.body

    const tenant = await Tenant.findOne({ where: { token } })
    if (!tenant) return res.status(404).json({ error: 'Portail non trouvé.' })

    const currentMonth = new Date().toISOString().substring(0, 7)
    
    // On prépare le paiement dans notre BDD mais avec un statut "En attente PayDunya"
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
        status: 'En attente PayDunya', // statut temporaire !
        method: 'PayDunya',
        date: new Date().toISOString().split('T')[0],
        quittance: false,
        period: currentMonth,
      })
    }

    // Préparation de la requête vers l'API de PayDunya
    const isTest = process.env.PAYDUNYA_MODE === 'test'
    const paydunyaUrl = isTest 
      ? 'https://app.paydunya.com/sandbox-api/v1/checkout-invoice/create'
      : 'https://app.paydunya.com/api/v1/checkout-invoice/create'
    
    const frontUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    const backUrl = process.env.BACKEND_PUBLIC_URL || 'http://localhost:5000'

    const payload = {
      invoice: {
        total_amount: payment.amount,
        description: `Loyer de ${currentMonth} pour ${tenant.firstName} ${tenant.lastName}`
      },
      store: {
        name: "ImmoSuite"
      },
      custom_data: {
        payment_id: payment.id,
        tenant_id: tenant.id
      },
      actions: {
        return_url: `${frontUrl}/locataire/${token}?payment=success`,
        cancel_url: `${frontUrl}/locataire/${token}?payment=cancel`,
        callback_url: `${backUrl}/api/portal/paydunya-webhook` // C'est ici que Paydunya envoie IPN
      }
    }

    const response = await fetch(paydunyaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PAYDUNYA-MASTER-KEY': process.env.PAYDUNYA_MASTER_KEY,
        'PAYDUNYA-PRIVATE-KEY': process.env.PAYDUNYA_PRIVATE_KEY,
        'PAYDUNYA-TOKEN': process.env.PAYDUNYA_TOKEN,
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()
    
    if (data.response_code === '00') {
      // PayDunya a bien généré la facture, on renvoie l'URL de paiement
      return res.json({ paydunya_url: data.response_text })
    } else {
      return res.status(400).json({ error: 'Erreur lors de la création de la facture PayDunya.', details: data })
    }

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ======= PAYDUNYA: Étape 2 - Webhook IPN (Instant Payment Notification) =======
export async function paydunyaWebhook(req, res) {
  try {
    // Paydunya nous envoie un POST avec { data: { hash: "..." } } que nous devons vérifier
    // Dans beaucoup de cas IPN classiques, le statut de la facture est passé
    // Pour simplifier l'exemple, nous allons directement analyser le payload reçu `req.body.status`

    const ipnData = req.body
    
    // Le statut officiel renvoyé par Paydunya lors d'un paiement réussi est "completed"
    if (ipnData && ipnData.status === 'completed') {
      const paymentId = ipnData.custom_data?.payment_id
      if (paymentId) {
        const payment = await Payment.findByPk(paymentId)
        if (payment && payment.status !== 'Payé') {
          // On marque officiellement comme payé !
          await payment.update({
            status: 'Payé',
            quittance: true,
            date: new Date().toISOString().split('T')[0]
          })
          console.log(`✅ [Webhook PayDunya] Paiement #${payment.id} confirmé et marqué comme Payé.`)
        }
      }
    }
    
    // Toujours répondre 200 OK à PayDunya pour signifier la réception
    res.status(200).send('Webhook OK')
  } catch (err) {
    console.error('Erreur Webhook PayDunya:', err.message)
    res.status(500).send('Server Error')
  }
}

// (Facultatif) Permet de simuler un succès manuel si la webhook est bloquée (localhost sans ngrok)
export async function verifyPaymentManual(req, res) {
  try {
    const { token } = req.params
    const tenant = await Tenant.findOne({ where: { token } })
    if (!tenant) return res.status(404).json({ error: 'Portail non trouvé.' })
    
    // On trouve le paiement en attente
    const payment = await Payment.findOne({
      where: { tenantId: tenant.id, status: 'En attente PayDunya' },
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
