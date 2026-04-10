import { Router } from 'express'
import { getAll, create, getQuittance, generateQuittances, sendRelances, exportPayments, getRelancesHistory } from '../controllers/paymentController.js'
import auth from '../middleware/auth.js'

const router = Router()

router.get('/', auth, getAll)
router.post('/', auth, create)
router.get('/:id/quittance', auth, getQuittance)
router.post('/generate-quittances', auth, generateQuittances)
router.post('/send-relances', auth, sendRelances)
router.get('/export', auth, exportPayments)
router.get('/relances-history', auth, getRelancesHistory)

export default router
