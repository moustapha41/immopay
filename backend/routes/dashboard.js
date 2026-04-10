import { Router } from 'express'
import { getDashboard, getRevenueChart } from '../controllers/dashboardController.js'
import auth from '../middleware/auth.js'

const router = Router()

router.get('/', auth, getDashboard)
router.get('/revenue-chart', auth, getRevenueChart)

export default router
