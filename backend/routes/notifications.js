import { Router } from 'express'
import auth from '../middleware/auth.js'
import { getAll, markAsRead, markAllAsRead } from '../controllers/notificationController.js'

const router = Router()

router.get('/', auth, getAll)
router.put('/:id/read', auth, markAsRead)
router.put('/read-all', auth, markAllAsRead)

export default router
