import { Router } from 'express'
import { getAll, create, update, advance, convert, remove } from '../controllers/prospectController.js'
import auth from '../middleware/auth.js'

const router = Router()

router.get('/', auth, getAll)
router.post('/', auth, create)
router.put('/:id', auth, update)
router.put('/:id/advance', auth, advance)
router.post('/:id/convert', auth, convert)
router.delete('/:id', auth, remove)

export default router
