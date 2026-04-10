import { Router } from 'express'
import { getPortalData, portalPay } from '../controllers/portalController.js'

const router = Router()

// No auth — accessed by token in the URL
router.get('/:token', getPortalData)
router.post('/:token/pay', portalPay)

export default router
