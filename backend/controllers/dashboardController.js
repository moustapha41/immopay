import { Property, Tenant, Payment, Prospect, Charge } from '../models/index.js'
import { Op } from 'sequelize'
import sequelize from '../config/db.js'

export async function getDashboard(req, res) {
  try {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

    const totalProperties = await Property.count()
    const occupiedProperties = await Property.count({ where: { status: 'Loué' } })
    const occupancyRate = totalProperties > 0 ? Math.round((occupiedProperties / totalProperties) * 100) : 0

    const activeTenants = await Tenant.count({ where: { status: 'Actif' } })
    const activeProspects = await Prospect.count()

    // Revenue this month
    const monthPayments = await Payment.findAll({
      where: {
        date: { [Op.gte]: `${currentMonth}-01`, [Op.lte]: `${currentMonth}-${lastDayOfMonth}` },
      },
    })

    const totalRevenue = monthPayments
      .filter(p => p.status === 'Payé')
      .reduce((sum, p) => sum + p.amount, 0)

    const unpaidPayments = monthPayments.filter(p => p.status === 'En retard')
    const unpaidTotal = unpaidPayments.reduce((sum, p) => sum + p.amount, 0)

    // Recent activity — last 10 payments
    const recentPayments = await Payment.findAll({
      order: [['created_at', 'DESC']],
      limit: 10,
    })

    const recentActivity = recentPayments.map(p => ({
      id: p.id,
      text: `Paiement ${p.status === 'Payé' ? 'reçu' : 'en retard'} — ${p.tenantName} — ${p.amount.toLocaleString('fr-FR')} FCFA`,
      time: getRelativeTime(p.createdAt),
      type: 'payment',
    }))

    res.json({
      totalProperties,
      occupancyRate,
      totalRevenue,
      unpaidCount: unpaidPayments.length,
      unpaidTotal,
      activeProspects,
      activeTenants,
      recentActivity,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function getRevenueChart(req, res) {
  try {
    const months = []
    const now = new Date()

    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
      const monthLabel = d.toLocaleDateString('fr-FR', { month: 'short' })

      const payments = await Payment.findAll({
        where: {
          date: { [Op.gte]: `${monthKey}-01`, [Op.lte]: `${monthKey}-${lastDay}` },
          status: 'Payé',
        },
      })
      const revenue = payments.reduce((sum, p) => sum + p.amount, 0)

      const chargesData = await Charge.findAll({
        where: {
          category: 'owner',
          date: { [Op.gte]: `${monthKey}-01`, [Op.lte]: `${monthKey}-${lastDay}` },
        },
      })
      const charges = chargesData.reduce((sum, c) => sum + c.amount, 0)

      months.push({ month: monthLabel, revenue, charges })
    }

    res.json(months)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

function getRelativeTime(date) {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `Il y a ${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Hier'
  return `Il y a ${days} jours`
}
