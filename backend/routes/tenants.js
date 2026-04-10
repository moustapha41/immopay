import { Router } from 'express'
import { getAll, getById, create, update, remove, settle, generateMonthlyPayments } from '../controllers/tenantController.js'
import auth from '../middleware/auth.js'

const router = Router()

router.get('/', auth, getAll)
router.get('/:id', auth, getById)
router.post('/', auth, create)
router.put('/:id', auth, update)
router.delete('/:id', auth, remove)
router.post('/:id/settle', auth, settle)
router.post('/generate-monthly', auth, generateMonthlyPayments)

export default router
