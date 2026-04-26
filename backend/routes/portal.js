import { Router } from 'express'
import { getPortalData, paytechInit, paytechWebhook, verifyPaymentManual, paydunyaInit, paydunyaWebhook } from '../controllers/portalController.js'

const router = Router()

// Les routes avec le token (Locataire)
router.get('/:token', getPortalData)
router.post('/:token/paytech-init', paytechInit)
router.post('/:token/paydunya-init', paydunyaInit)
router.post('/:token/verify-payment', verifyPaymentManual)

// Webhooks PSP
router.post('/paytech-webhook', paytechWebhook)
router.post('/paydunya-webhook', paydunyaWebhook)

export default router
