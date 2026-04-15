import { useState, useEffect, useMemo } from 'react'
import {
  Building2, Users, TrendingUp, AlertTriangle,
  CreditCard, Eye, ArrowUpRight, ArrowDownRight,
  Calendar, Clock, UserCheck
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts'
import { dashboard as dashboardApi, tenants as tenantsApi, payments as paymentsApi } from '../api'
import Toast from '../components/Toast'
import Modal from '../components/Modal'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import frLocale from '@fullcalendar/core/locales/fr'

function formatFCFA(amount) {
  return (amount || 0).toLocaleString('fr-FR') + ' FCFA'
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(17, 24, 39, 0.95)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '10px',
        padding: '12px 16px',
        fontSize: '13px'
      }}>
        <p style={{ color: '#8b95a5', marginBottom: 4 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, fontWeight: 600 }}>
            {p.name}: {formatFCFA(p.value)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

// Composant pour afficher les prochaines échéances
function UpcomingDeadlines({ tenants, payments, onOpenCalendar }) {
  // Calculer les prochaines échéances
  const deadlines = useMemo(() => {
    const today = new Date()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    const allDeadlines = []

    tenants.forEach(tenant => {
      if (!tenant.dateEntree || tenant.status !== 'Actif') return

      const entryDate = new Date(tenant.dateEntree)
      const entryDay = entryDate.getDate()

      // Générer les 3 prochains mois d'échéances
      for (let i = 0; i < 3; i++) {
        let dueMonth = currentMonth + i
        let dueYear = currentYear

        if (dueMonth > 11) {
          dueMonth = dueMonth - 12
          dueYear++
        }

        const dueDate = new Date(dueYear, dueMonth, entryDay)

        // Vérifier si ce paiement existe déjà
        const existingPayment = payments.find(p =>
          p.tenantId === tenant.id &&
          p.period === `${dueYear}-${String(dueMonth + 1).padStart(2, '0')}`
        )

        const isPaid = existingPayment?.status === 'Payé'
        const isUnpaid = existingPayment?.status === 'En retard'

        // Calculer jours restants
        const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))

        // Ne montrer que les échéances futures ou récentes
        if (daysUntil >= -5) {
          allDeadlines.push({
            id: `${tenant.id}-${dueMonth}-${dueYear}`,
            label: `Loyer — ${tenant.propertyName || 'Bien'}`,
            sub: `${tenant.firstName} ${tenant.lastName}`,
            date: dueDate,
            daysUntil,
            isPaid,
            isUnpaid,
            badge: isPaid ? 'Payé' : isUnpaid ? 'Impayé' : 'À payer',
            color: isPaid ? 'badge-success' : isUnpaid ? 'badge-danger' : daysUntil <= 3 ? 'badge-warning' : 'badge-primary'
          })
        }
      }
    })

    // Trier par date et prendre les 5 premiers
    return allDeadlines
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5)
  }, [tenants, payments])

  const formatDate = (deadline) => {
    if (deadline.daysUntil === 0) return "Aujourd'hui"
    if (deadline.daysUntil === 1) return "Demain"
    if (deadline.daysUntil < 7) return `Dans ${deadline.daysUntil} jours`
    return deadline.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="card animate-fade-in-up">
      <div className="card-header">
        <div className="card-title">Prochaines échéances</div>
        <button className="btn btn-ghost btn-sm" onClick={onOpenCalendar}>
          <Calendar size={14} /> Calendrier
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {deadlines.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-md)', color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>
            Aucune échéance à venir
          </div>
        ) : (
          deadlines.map((item) => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: 'var(--space-md)', borderRadius: 'var(--radius-md)',
              background: 'var(--bg-glass)', border: '1px solid var(--border-color)',
              transition: 'all 0.2s ease', cursor: 'pointer'
            }}
              onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-glass-hover)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
              onMouseOut={e => { e.currentTarget.style.background = 'var(--bg-glass)'; e.currentTarget.style.borderColor = 'var(--border-color)' }}
            >
              <div>
                <div style={{ fontSize: 'var(--font-sm)', fontWeight: 600, marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>{item.sub}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <span className={`badge badge-dot ${item.color}`}>{item.badge}</span>
                <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDate(item)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// Composant pour le calendrier avec événements
function CalendarEvents({ tenants, payments }) {
  const [calendarView, setCalendarView] = useState('dayGridMonth')

  const events = useMemo(() => {
    const allEvents = []

    tenants.forEach(tenant => {
      if (!tenant.dateEntree || tenant.status !== 'Actif') return

      const entryDate = new Date(tenant.dateEntree)
      const entryDay = entryDate.getDate()
      const today = new Date()

      // Générer les 6 prochains mois d'échéances pour le calendrier
      for (let i = 0; i < 6; i++) {
        const dueMonth = today.getMonth() + i
        const dueYear = today.getFullYear() + Math.floor(dueMonth / 12)
        const actualMonth = dueMonth % 12

        const dueDate = new Date(dueYear, actualMonth, entryDay)
        const period = `${dueYear}-${String(actualMonth + 1).padStart(2, '0')}`

        const existingPayment = payments.find(p =>
          p.tenantId === tenant.id && p.period === period
        )

        const isPaid = existingPayment?.status === 'Payé'
        const isUnpaid = existingPayment?.status === 'En retard'

        let color = '#3b82f6' // bleu - à payer
        if (isPaid) color = '#10b981' // vert
        else if (isUnpaid) color = '#ef4444' // rouge

        // Titre: Type d'échéance + Bien (sujet)
        const title = `Loyer — ${tenant.propertyName || 'Bien'}`

        allEvents.push({
          title: title,
          date: dueDate.toISOString().split('T')[0],
          backgroundColor: color,
          borderColor: color,
          textColor: '#fff',
          extendedProps: {
            tenant: `${tenant.firstName} ${tenant.lastName}`,
            property: tenant.propertyName,
            status: isPaid ? 'Payé' : isUnpaid ? 'Impayé' : 'À payer',
            amount: tenant.rent
          }
        })
      }
    })

    return allEvents
  }, [tenants, payments])

  const viewOptions = [
    { value: 'dayGridMonth', label: 'Mois', icon: Calendar },
    { value: 'dayGridWeek', label: 'Semaine', icon: Calendar },
    { value: 'dayGridDay', label: 'Jour', icon: Calendar },
    { value: 'listMonth', label: 'Liste', icon: Clock },
  ]

  const currentViewLabel = viewOptions.find(v => v.value === calendarView)?.label || 'Mois'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Barre d'outils du calendrier */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: '#fff',
        borderBottom: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md) var(--radius-md) 0 0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
            Vue: {currentViewLabel}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
          {viewOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setCalendarView(option.value)}
              style={{
                padding: '6px 12px',
                fontSize: 'var(--font-xs)',
                fontWeight: 500,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                background: calendarView === option.value ? 'var(--primary)' : '#fff',
                color: calendarView === option.value ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Calendrier */}
      <div style={{ flex: 1, background: '#fff', borderRadius: '0 0 var(--radius-md) var(--radius-md)' }}>
        <FullCalendar
          plugins={[ dayGridPlugin ]}
          initialView={calendarView}
          headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
          locale={frLocale}
          events={events}
          height="100%"
          firstDay={1}
          buttonText={{ today: "Auj.'hui" }}
          eventContent={(eventInfo) => (
            <div style={{
              fontSize: '10px',
              fontWeight: 500,
              padding: '2px 4px',
              borderRadius: '3px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              backgroundColor: eventInfo.event.backgroundColor,
              color: eventInfo.event.textColor,
              cursor: 'pointer',
              lineHeight: '1.3'
            }}>
              {eventInfo.event.title}
            </div>
          )}
          eventClick={(info) => {
            const props = info.event.extendedProps
            alert(`${props.tenant}\n${props.property}\nMontant: ${props.amount?.toLocaleString('fr-FR')} FCFA\nStatut: ${props.status}`)
          }}
        />
      </div>
    </div>
  )
}

function Dashboard() {
  const [toastMessage, setToastMessage] = useState('')
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [data, setData] = useState(null)
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)
  const [tenants, setTenants] = useState([])
  const [payments, setPayments] = useState([])

  useEffect(() => {
    async function load() {
      try {
        // D'abord créer les loyers mensuels impayés automatiquement
        await tenantsApi.generateMonthly()
        
        // Puis charger les données
        const [dash, chart, t, p] = await Promise.all([
          dashboardApi.get(),
          dashboardApi.getRevenueChart(),
          tenantsApi.getAll(),
          paymentsApi.getAll(),
        ])
        setData(dash)
        setChartData(chart)
        setTenants(t)
        setPayments(p)
      } catch (err) {
        setToastMessage('Erreur de chargement: ' + err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading || !data) {
    return <div className="animate-fade-in" style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-muted)' }}>Chargement du tableau de bord...</div>
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Tableau de Bord</h1>
        <p>Vue d'ensemble de votre patrimoine immobilier</p>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid stagger">
        <div className="stat-card" id="stat-properties">
          <div className="stat-card-icon blue"><Building2 size={22} /></div>
          <div className="stat-card-value">{data.totalProperties}</div>
          <div className="stat-card-label">Biens en gestion</div>
        </div>

        <div className="stat-card" id="stat-revenue">
          <div className="stat-card-icon gold"><CreditCard size={22} /></div>
          <div className="stat-card-value">{formatFCFA(data.expectedMonthlyRevenue)}</div>
          <div className="stat-card-label">Revenus attendus (baux)</div>
          <span className="stat-card-trend up">
            <ArrowUpRight size={12} /> {formatFCFA(data.totalRevenue)} encaissé
          </span>
        </div>

        <div className="stat-card" id="stat-occupancy">
          <div className="stat-card-icon green"><TrendingUp size={22} /></div>
          <div className="stat-card-value">{data.occupancyRate}%</div>
          <div className="stat-card-label">Taux d'occupation</div>
        </div>

        <div className="stat-card" id="stat-unpaid">
          <div className="stat-card-icon red"><AlertTriangle size={22} /></div>
          <div className="stat-card-value">{data.unpaidCount}</div>
          <div className="stat-card-label">Impayés ce mois</div>
          <span className="stat-card-trend down">
            <ArrowDownRight size={12} /> {formatFCFA(data.unpaidTotal)}
          </span>
        </div>

        <div className="stat-card" id="stat-prospects">
          <div className="stat-card-icon purple"><Users size={22} /></div>
          <div className="stat-card-value">{data.activeProspects}</div>
          <div className="stat-card-label">Prospects actifs</div>
        </div>

        <div className="stat-card" id="stat-tenants">
          <div className="stat-card-icon indigo"><UserCheck size={22} /></div>
          <div className="stat-card-value">{data.activeLeaseCount}</div>
          <div className="stat-card-label">Baux actifs</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid-2" style={{ marginBottom: 'var(--space-2xl)' }}>
        <div className="card animate-fade-in-up">
          <div className="card-header">
            <div>
              <div className="card-title">Revenus & Charges</div>
              <div className="card-subtitle">Évolution sur 8 mois</div>
            </div>

          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradCharges" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d4a843" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#d4a843" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: '#5a6474', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#5a6474', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" name="Revenus" stroke="#3b82f6" fill="url(#gradRevenue)" strokeWidth={2} />
                <Area type="monotone" dataKey="charges" name="Charges" stroke="#d4a843" fill="url(#gradCharges)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card animate-fade-in-up">
          <div className="card-header">
            <div>
              <div className="card-title">Encaissements mensuels</div>
              <div className="card-subtitle">Loyers perçus par mois</div>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: '#5a6474', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#5a6474', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="Revenus" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid-2">
        {/* Recent Activity */}
        <div className="card animate-fade-in-up">
          <div className="card-header">
            <div className="card-title">Activité récente</div>
            <button className="btn btn-ghost btn-sm">Tout voir</button>
          </div>
          <div className="timeline">
            {(data.recentActivity || []).slice(0, 6).map(item => (
              <div key={item.id} className="timeline-item">
                <div className="timeline-item-time">
                  <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />
                  {item.time}
                </div>
                <div className="timeline-item-content">{item.text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming - calculé à partir des locataires et paiements */}
        <UpcomingDeadlines tenants={tenants} payments={payments} onOpenCalendar={() => setIsCalendarOpen(true)} />
      </div>
      
      <Modal isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} title="Calendrier des Échéances" maxWidth="900px">
         <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
           <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: 12, border: '1px solid var(--border-color)', height: 500 }}>
             <CalendarEvents tenants={tenants} payments={payments} />
           </div>
           <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
              <button className="btn btn-primary" onClick={() => setIsCalendarOpen(false)}>Fermer</button>
           </div>
         </div>
      </Modal>

      <Toast message={toastMessage} onClose={() => setToastMessage('')} />
    </div>
  )
}

export default Dashboard
