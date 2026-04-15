import { Router } from 'express'
import { getPortalData, paydunyaInit, paydunyaWebhook, verifyPaymentManual } from '../controllers/portalController.js'

const router = Router()

// Les routes avec le token (Locataire)
router.get('/:token', getPortalData)
router.post('/:token/paydunya-init', paydunyaInit)
router.post('/:token/verify-payment', verifyPaymentManual)

// Le Webhook PayDunya (Sans token, appelé par les serveurs PayDunya)
router.post('/paydunya-webhook', paydunyaWebhook)

export default router
