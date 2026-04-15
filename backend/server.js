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
import accountingRoutes from './routes/accounting.js'
import leaseRoutes from './routes/leases.js'
import { startLeaseExpirationJob } from './jobs/leaseExpirationJob.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'PAYDUNYA-MASTER-KEY', 'PAYDUNYA-PRIVATE-KEY', 'PAYDUNYA-TOKEN']
}))
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
app.use('/api/accounting', accountingRoutes)
app.use('/api/leases', leaseRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Start
async function start() {
  try {
    await sequelize.authenticate()
    console.log('✅ PostgreSQL connecté avec succès.')

    // === Migration manuelle pour PostgreSQL ENUMs ===
    const qi = sequelize.getQueryInterface()

    // Ajouter les nouvelles valeurs aux ENUMs existants (ignorer si déjà présentes)
    const enumMigrations = [
      `DO $$ BEGIN ALTER TYPE "enum_properties_status" ADD VALUE IF NOT EXISTS 'Partiellement Loué'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      `DO $$ BEGIN ALTER TYPE "enum_properties_status" ADD VALUE IF NOT EXISTS 'Complet'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      `DO $$ BEGIN ALTER TYPE "enum_payments_status" ADD VALUE IF NOT EXISTS 'Partiel'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
    ]
    for (const sql of enumMigrations) {
      try { await sequelize.query(sql) } catch (e) { /* ignore if exists */ }
    }

    // Convertir le champ 'type' de ENUM vers VARCHAR pour supporter les sous-types flexibles
    try {
      // Vérifier si la colonne est encore un ENUM
      const [colInfo] = await sequelize.query(
        `SELECT data_type, udt_name FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'type'`
      )
      if (colInfo.length > 0 && colInfo[0].data_type === 'USER-DEFINED') {
        await sequelize.query(`ALTER TABLE properties ALTER COLUMN "type" TYPE VARCHAR(255) USING "type"::text;`)
        await sequelize.query(`DROP TYPE IF EXISTS "enum_properties_type";`)
        console.log('✅ Colonne type convertie de ENUM vers VARCHAR.')
      }
    } catch (e) { console.log('Migration type:', e.message) }

    // Ajouter les colonnes manuellement si elles n'existent pas
    const columnMigrations = [
      `ALTER TABLE properties ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES properties(id) ON DELETE SET NULL;`,
      `ALTER TABLE properties ADD COLUMN IF NOT EXISTS max_tenants INTEGER DEFAULT 1;`,
      // Nouvelle colonne category
      `DO $$ BEGIN CREATE TYPE "enum_properties_category" AS ENUM ('Résidentiel', 'Commercial', 'Terrain'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      `ALTER TABLE properties ADD COLUMN IF NOT EXISTS category "enum_properties_category" DEFAULT 'Résidentiel';`,
      // Mettre à jour les existants qui n'ont pas de catégorie
      `UPDATE properties SET category = 'Résidentiel' WHERE category IS NULL;`,
    ]
    for (const sql of columnMigrations) {
      try { await sequelize.query(sql) } catch (e) { /* ignore if exists */ }
    }

    console.log('✅ Migrations enum/colonnes effectuées.')

    await sequelize.sync({ alter: true })
    console.log('✅ Tables synchronisées.')

    app.listen(PORT, () => {
      console.log(`🚀 ImmoSuite Backend démarré sur http://localhost:${PORT}`)
    })

    // Démarrer les jobs en arrière-plan
    startLeaseExpirationJob()
  } catch (err) {
    console.error('❌ Erreur de démarrage:', err.message)
    process.exit(1)
  }
}

start()
