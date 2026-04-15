import cron from 'node-cron'
import { Op } from 'sequelize'
import { Lease, Property } from '../models/index.js'
import { recalculateUnitStatus } from '../controllers/propertyController.js'

export function startLeaseExpirationJob() {
  // Exécuter tous les jours à minuit
  cron.schedule('0 0 * * *', async () => {
    console.log('🔄 [CRON] Vérification de l\'expiration des baux...')
    await checkExpirations()
  })

  // Exécuter également au démarrage du serveur
  setTimeout(() => {
    checkExpirations()
  }, 5000)
}

async function checkExpirations() {
  try {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    
    // Trouver tous les baux actifs dont la date de fin est dépassée
    const expiredLeases = await Lease.findAll({
      where: {
        status: 'Actif',
        endDate: {
          [Op.not]: null,
          [Op.lt]: today
        }
      }
    })

    if (expiredLeases.length === 0) {
      console.log('✅ [CRON] Aucun bail expiré trouvé.')
      return
    }

    console.log(`⚠️ [CRON] ${expiredLeases.length} baux expirés trouvés. Résiliation en cours...`)

    for (const lease of expiredLeases) {
      // Mettre à jour le bail
      lease.status = 'Terminé'
      await lease.save()

      // Recalculer le statut du bien associé
      const property = await Property.findByPk(lease.propertyId)
      if (property) {
        await recalculateUnitStatus(property.id)
      }
      console.log(`- Bail #${lease.id} (${lease.bailNumber}) expiré et fermé.`)
    }

    console.log('✅ [CRON] Mise à jour des baux terminée.')
  } catch (error) {
    console.error('❌ [CRON] Erreur lors de la vérification des baux:', error)
  }
}
