import { Router } from 'express'
import { getAll, create, update, settle, remove } from '../controllers/chargeController.js'
import auth from '../middleware/auth.js'

const router = Router()

router.get('/', auth, getAll)
router.post('/', auth, create)
router.put('/:id', auth, update)
router.put('/:id/settle', auth, settle)
router.delete('/:id', auth, remove)

export default router
