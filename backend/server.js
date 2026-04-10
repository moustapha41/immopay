import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { sequelize } from './models/index.js'

// Routes
import authRoutes from './routes/auth.js'
import propertyRoutes from './routes/properties.js'
import tenantRoutes from './routes/tenants.js'
import prospectRoutes from './routes/prospects.js'
import paymentRoutes from './routes/payments.js'
import chargeRoutes from './routes/charges.js'
import dashboardRoutes from './routes/dashboard.js'
import portalRoutes from './routes/portal.js'
import settingsRoutes from './routes/settings.js'
import notificationRoutes from './routes/notifications.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/properties', propertyRoutes)
app.use('/api/tenants', tenantRoutes)
app.use('/api/prospects', prospectRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/charges', chargeRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/portal', portalRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/notifications', notificationRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Start
async function start() {
  try {
    await sequelize.authenticate()
    console.log('✅ PostgreSQL connecté avec succès.')

    await sequelize.sync({ alter: true })
    console.log('✅ Tables synchronisées.')

    app.listen(PORT, () => {
      console.log(`🚀 ImmoSuite Backend démarré sur http://localhost:${PORT}`)
    })
  } catch (err) {
    console.error('❌ Erreur de démarrage:', err.message)
    process.exit(1)
  }
}

start()
