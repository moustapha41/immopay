import { Router } from 'express'
import { getSettings, updateSettings, uploadLogo, resetSystem } from '../controllers/settingsController.js'
import auth from '../middleware/auth.js'

const router = Router()

router.get('/', auth, getSettings)
router.put('/', auth, updateSettings)
router.post('/logo', auth, uploadLogo)
router.post('/reset', auth, resetSystem)

export default router
