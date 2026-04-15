import { useState, useEffect } from 'react'
import {
  CreditCard, AlertTriangle, CheckCircle2, Clock, Send,
  Download, Eye, Search, ArrowUpRight, ArrowDownRight,
  FileText, Bell, Loader2, Printer, Receipt
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { payments as paymentsApi, settings as settingsApi } from '../api'
import Modal from '../components/Modal'
import Toast from '../components/Toast'

function formatFCFA(amount) { return (amount || 0).toLocaleString('fr-FR') + ' FCFA' }

const statusConfig = {
  'Payé': { badge: 'badge-success', icon: CheckCircle2, color: '#10b981' },
  'Partiel': { badge: 'badge-warning', icon: AlertTriangle, color: '#f97316' },
  'En retard': { badge: 'badge-danger', icon: AlertTriangle, color: '#ef4444' },
  'En attente': { badge: 'badge-warning', icon: Clock, color: '#f59e0b' },
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (<div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 16px', fontSize: '13px' }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (<p key={i} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {formatFCFA(p.value)}</p>))}
    </div>)
  }
  return null
}

function Payments() {
  const [activeTab, setActiveTab] = useState('Tous')
  const [searchTerm, setSearchTerm] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [allPayments, setAllPayments] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSendingAlerts, setIsSendingAlerts] = useState(false)
  const [selectedDetails, setSelectedDetails] = useState(null)
  const [limitPaiements, setLimitPaiements] = useState(7)
  const [agencySettings, setAgencySettings] = useState({})
  const [relancesHistory, setRelancesHistory] = useState([])

  useEffect(() => {
    async function load() {
      try {
        const [p, s, r] = await Promise.all([paymentsApi.getAll(), settingsApi.get(), paymentsApi.getRelancesHistory()])
        setAllPayments(p)
        setAgencySettings(s)
        setRelancesHistory(r)
      } catch (err) { setToastMessage('Erreur: ' + err.message) }
    }
    load()
  }, [])

  const handleGenerateQuittances = async () => {
    setIsGenerating(true)
    try {
      await paymentsApi.generateQuittances()
      const agencyName = agencySettings.agencyName || 'ImmoSuite Sénégal'
      const agencyLogo = agencySettings.logoUrl || ''
      const exportPayload = await paymentsApi.exportAll()
      const sourcePayments = Array.isArray(exportPayload?.payments) ? exportPayload.payments : allPayments
      const paidPayments = sourcePayments
        .filter(p => p.status === 'Payé')
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))

      if (paidPayments.length === 0) {
        setToastMessage('Aucune quittance à exporter.')
        return
      }

      const totalGlobal = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
      const dateGlobal = new Date().toLocaleDateString('fr-FR')

      const tableRows = paidPayments.map(payment => `
        <tr style="border-bottom: 1px solid #cbd5e1;">
          <td style="padding: 12px 8px;">${payment.tenantName}</td>
          <td style="padding: 12px 8px;">${payment.propertyName}</td>
          <td style="padding: 12px 8px;">${payment.period || (payment.date || '').substring(0, 7)}</td>
          <td style="padding: 12px 8px; text-align: right; font-weight: bold;">${formatFCFA(payment.amount)}</td>
        </tr>
      `).join('')

      const quittanceGlobalHtml = `
        <div style="font-family: Arial; padding: 40px; max-width: 800px; margin: 0 auto; color: #1e3a5f;">
          <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #1e3a5f; padding-bottom: 20px; margin-bottom: 40px;">
            <div>
              <h1 style="margin: 0; color: #d4a843;">QUITTANCE GLOBALE DE LOYER</h1>
              <p style="margin: 5px 0 0 0; color: #64748b;">N° QG-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}</p>
            </div>
            <div style="text-align: right; display: flex; align-items: center; gap: 12px;">
              ${agencyLogo ? `<img src="${agencyLogo}" alt="Logo agence" style="max-height: 56px; max-width: 120px; object-fit: contain;" />` : ''}
              <div>
                <h2 style="margin: 0;">${agencyName}</h2>
                <p style="margin: 5px 0 0 0; color: #64748b;">Édité le ${dateGlobal}</p>
              </div>
            </div>
          </div>
          <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <p style="font-size: 14px; font-weight: bold; color: #64748b; margin: 0;">RÉCAPITULATIF DES PAIEMENTS</p>
            <p style="margin: 8px 0 0 0; color: #1e3a5f;">${paidPayments.length} locataire(s) concerné(s)</p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
              <tr style="border-bottom: 2px solid #1e3a5f;">
                <th style="text-align: left; padding: 12px 8px; color: #1e3a5f;">Locataire</th>
                <th style="text-align: left; padding: 12px 8px; color: #1e3a5f;">Bien</th>
                <th style="text-align: left; padding: 12px 8px; color: #1e3a5f;">Période</th>
                <th style="text-align: right; padding: 12px 8px; color: #1e3a5f;">Montant</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
            <tfoot>
              <tr style="border-top: 2px solid #1e3a5f; background: #e0f2fe;">
                <td colspan="3" style="padding: 16px 8px; font-weight: bold; font-size: 16px;">TOTAL GÉNÉRAL</td>
                <td style="padding: 16px 8px; text-align: right; font-weight: bold; font-size: 20px; color: #d4a843;">${formatFCFA(totalGlobal)}</td>
              </tr>
            </tfoot>
          </table>
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #cbd5e1; color: #64748b; font-size: 12px;">
            <p>Ce document atteste que tous les paiements listés ci-dessus ont été reçus par l'agence.</p>
          </div>
        </div>`

      const printWin = window.open('', '_blank')
      printWin.document.write(`
        <html>
          <head>
            <title>Quittance Globale</title>
            <style>
              @page { size: A4; margin: 12mm; }
              body { margin: 0; padding: 0; }
            </style>
          </head>
          <body>${quittanceGlobalHtml}</body>
        </html>
      `)
      printWin.document.close()
      printWin.focus()
      setTimeout(() => {
        printWin.print()
        printWin.close()
      }, 250)
      setToastMessage(`Quittance globale générée avec ${paidPayments.length} paiements.`)
    } catch (err) { setToastMessage('Erreur: ' + err.message) }
    setIsGenerating(false)
    setTimeout(() => setToastMessage(''), 4000)
  }

  const handleSendRelances = async () => {
    setIsSendingAlerts(true)
    try {
      const result = await paymentsApi.sendRelances()
      setToastMessage(result.message)
      // Recharger l'historique après envoi
      const updatedHistory = await paymentsApi.getRelancesHistory()
      setRelancesHistory(updatedHistory)
    } catch (err) { setToastMessage('Erreur: ' + err.message) }
    setIsSendingAlerts(false)
    setTimeout(() => setToastMessage(''), 4000)
  }

  const handlePrintQuittance = (payment) => {
    const agencyName = agencySettings.agencyName || 'ImmoSuite Sénégal'
    const html = `<div style="font-family: Arial; padding: 40px; max-width: 800px; margin: 0 auto; color: #1e3a5f;">
      <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #1e3a5f; padding-bottom: 20px; margin-bottom: 40px;">
        <div><h1 style="margin: 0; color: #d4a843;">QUITTANCE DE LOYER</h1></div>
        <div style="text-align: right;"><h2 style="margin: 0;">${agencyName}</h2><p style="color: #64748b;">Édité le ${new Date().toLocaleDateString('fr-FR')}</p></div>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
        <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; width: 45%;"><p style="font-size: 12px; font-weight: bold; color: #64748b; margin-top: 0;">LOCATAIRE</p><p style="font-size: 18px; font-weight: bold; margin: 0;">${payment.tenantName}</p></div>
        <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; width: 45%;"><p style="font-size: 12px; font-weight: bold; color: #64748b; margin-top: 0;">BIEN</p><p style="margin: 0;">${payment.propertyName}</p></div>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;"><tr style="border-bottom: 1px solid #cbd5e1;"><th style="text-align: left; padding: 12px 0;">Désignation</th><th>Période</th><th style="text-align: right;">Montant</th></tr><tr><td style="padding: 12px 0;">Loyer + Charges</td><td>${(payment.date || '').substring(0, 7)}</td><td style="text-align: right; font-weight: bold;">${formatFCFA(payment.amount)}</td></tr></table>
      <div style="background: #e0f2fe; padding: 20px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;"><div><p style="margin: 0; font-weight: bold;">Paiement reçu</p><p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b;">Méthode: ${payment.method}</p></div><div style="font-size: 24px; font-weight: bold; color: #d4a843;">${formatFCFA(payment.amount)}</div></div>
    </div>`
    const w = window.open('', '_blank')
    w.document.write(`<html><head><title>Quittance - ${payment.tenantName}</title></head><body onload="window.print(); window.close();">${html}</body></html>`)
    w.document.close()
  }

  const currentMonth = allPayments.filter(p => (p.date || '').startsWith('2026-04'))
  const totalDue = currentMonth.reduce((s, p) => s + p.amount, 0)
  const totalPaid = currentMonth.filter(p => p.status === 'Payé' || p.status === 'Partiel').reduce((s, p) => s + (p.amountPaid || p.amount), 0)
  const totalUnpaid = currentMonth.filter(p => p.status === 'En retard' || p.status === 'Partiel').reduce((s, p) => s + (p.amount - (p.amountPaid || 0)), 0)
  const collectionRate = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0
  const pieData = [{ name: 'Encaissé', value: totalPaid || 1, color: '#10b981' }, { name: 'Impayé', value: totalUnpaid || 0, color: '#ef4444' }]

  // Calcul des données réelles pour le graphique d'évolution (6 derniers mois)
  const months = ['Nov', 'Déc', 'Jan', 'Fév', 'Mar', 'Avr']
  const monthPrefixes = ['2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04']
  const chartData = monthPrefixes.map((prefix, i) => {
    const monthPayments = allPayments.filter(p => (p.date || '').startsWith(prefix))
    const encaisse = monthPayments.filter(p => p.status === 'Payé' || p.status === 'Partiel').reduce((s, p) => s + (p.amountPaid || p.amount), 0)
    const impaye = monthPayments.filter(p => p.status === 'En retard' || p.status === 'Partiel').reduce((s, p) => s + (p.amount - (p.amountPaid || 0)), 0)
    return { month: months[i], encaissé: encaisse, impayé: impaye }
  })

  const filtered = allPayments.filter(p => {
    const matchTab = activeTab === 'Tous' || p.status === activeTab
    const matchSearch = (p.tenantName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (p.propertyName || '').toLowerCase().includes(searchTerm.toLowerCase())
    return matchTab && matchSearch
  })

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div><h1>Paiements & Encaissements</h1><p>Suivi des loyers, quittances et relances</p></div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-ghost" onClick={handleGenerateQuittances} disabled={isGenerating}>{isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Receipt size={16} />} {isGenerating ? "Génération..." : "Quittances"}</button>
          <button className="btn btn-primary" onClick={handleSendRelances} disabled={isSendingAlerts}>{isSendingAlerts ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />} {isSendingAlerts ? "Envoi..." : "Relances"}</button>
        </div>
      </div>

      <div className="stats-grid stagger">
        <div className="stat-card"><div className="stat-card-icon blue"><CreditCard size={22} /></div><div className="stat-card-value">{formatFCFA(totalDue)}</div><div className="stat-card-label">Total attendu</div></div>
        <div className="stat-card"><div className="stat-card-icon green"><CheckCircle2 size={22} /></div><div className="stat-card-value">{formatFCFA(totalPaid)}</div><div className="stat-card-label">Encaissé</div><span className="stat-card-trend up"><ArrowUpRight size={12} /> {collectionRate}%</span></div>
        <div className="stat-card"><div className="stat-card-icon red"><AlertTriangle size={22} /></div><div className="stat-card-value">{formatFCFA(totalUnpaid)}</div><div className="stat-card-label">Impayés</div></div>
        <div className="stat-card"><div className="stat-card-icon gold"><FileText size={22} /></div><div className="stat-card-value">{allPayments.filter(p => p.quittance).length}</div><div className="stat-card-label">Quittances émises</div></div>
      </div>

      {/* Évolution des encaissements */}
      <div className="grid-2" style={{ marginBottom: 'var(--space-2xl)' }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Évolution des encaissements</div>
              <div className="card-subtitle">6 derniers mois</div>
            </div>
          </div>
          <div className="chart-container" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradPaid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradUnpaid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="encaissé" name="Encaissé" stroke="#10b981" fill="url(#gradPaid)" strokeWidth={2} />
                <Area type="monotone" dataKey="impayé" name="Impayé" stroke="#ef4444" fill="url(#gradUnpaid)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Répartition Avril 2026</div>
              <div className="card-subtitle">Taux de recouvrement : {collectionRate}%</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280, gap: 'var(--space-2xl)' }}>
            <ResponsiveContainer width="50%" height="100%">
              <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="var(--bg-card)">{pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}</Pie><Tooltip content={<CustomTooltip />} /></PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
              {pieData.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: item.color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>{formatFCFA(item.value)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-bar"><Search size={16} /><input type="text" placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
        <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none' }}>
          {['Tous', 'Payé', 'Partiel', 'En retard'].map(tab => (<button key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</button>))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-2xl)' }}>
        <div className="card-header"><div className="card-title">Historique des paiements</div></div>
        <table className="data-table">
          <thead><tr><th>Locataire</th><th>Bien</th><th>Montant</th><th>Statut</th><th>Date</th><th>Méthode</th><th>Quittance</th><th></th></tr></thead>
          <tbody>{filtered.slice(0, limitPaiements).map(payment => {
            const config = statusConfig[payment.status] || statusConfig['En attente']
            return (<tr key={payment.id}>
              <td><div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><div className="avatar avatar-sm" style={{ background: payment.status === 'En retard' ? 'linear-gradient(135deg, #ef4444, #f97316)' : 'linear-gradient(135deg, #10b981, #06b6d4)', color: '#fff' }}>{(payment.tenantName || '').split(' ').map(n => n[0]).join('')}</div><span style={{ fontWeight: 600 }}>{payment.tenantName}</span></div></td>
              <td style={{ color: 'var(--text-secondary)' }}>{payment.propertyName}</td>
              <td style={{ fontWeight: 700, color: payment.status === 'En retard' ? 'var(--danger)' : 'var(--accent-gold)' }}>
                {payment.status === 'Partiel' ? (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{formatFCFA(payment.amountPaid)}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>sur {formatFCFA(payment.amount)}</span>
                  </div>
                ) : formatFCFA(payment.amount)}
              </td>
              <td><span className={`badge badge-dot ${config.badge}`}>{payment.status}</span></td>
              <td style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)' }}>{payment.date}</td>
              <td style={{ color: 'var(--text-secondary)' }}>{payment.method}</td>
              <td>{payment.quittance ? <button className="btn btn-ghost btn-sm" onClick={() => handlePrintQuittance(payment)}><Printer size={13} /> PDF</button> : <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>—</span>}</td>
              <td><div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                {payment.status === 'En retard' && <button className="btn btn-primary btn-sm" onClick={handleSendRelances}><Send size={13} /></button>}
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDetails(payment)}><Eye size={15} /></button>
              </div></td>
            </tr>)
          })}</tbody>
        </table>
        {filtered.length > limitPaiements && (
           <div style={{ padding: 'var(--space-md)', textAlign: 'center', borderTop: '1px solid var(--border-color)' }}>
             <button className="btn btn-ghost" onClick={() => setLimitPaiements(prev => prev + 7)}>Voir plus d'historique</button>
           </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-2xl)' }}>
        <div className="card-header"><div className="card-title">Historique des relances</div></div>
        <div style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {relancesHistory.length === 0 ? (
            <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-md)' }}>
              Aucune relance envoyée pour le moment.
            </div>
          ) : (
            relancesHistory.map((r) => {
              const date = new Date(r.createdAt).toLocaleDateString('fr-FR')
              const isEmail = r.channel === 'email'
              const status = r.status === 'sent' ? 'Envoyé' : 'En attente'
              const color = r.status === 'sent' ? '#10b981' : '#f59e0b'
              return (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-sm)', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>{r.title}</div>
                      <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>{isEmail ? 'Email' : 'Notification'} — {date}</div>
                    </div>
                  </div>
                  <span className={`badge badge-dot ${r.status === 'sent' ? 'badge-success' : 'badge-warning'}`}>{status}</span>
                </div>
              )
            })
          )}
        </div>
      </div>

      <Modal isOpen={!!selectedDetails} onClose={() => setSelectedDetails(null)} title="Détails du Paiement">
        {selectedDetails && (<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid var(--border-color)' }}>
            <div><div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Locataire</div><div style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>{selectedDetails.tenantName}</div></div>
            <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Montant</div><div style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--accent-gold)' }}>{formatFCFA(selectedDetails.amount)}</div></div>
          </div>
          <div className="grid-2">
            <div><div style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>Bien</div><div>{selectedDetails.propertyName}</div></div>
            <div><div style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>Date</div><div>{selectedDetails.date}</div></div>
            <div><div style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>Statut</div><span className={`badge badge-dot ${statusConfig[selectedDetails.status]?.badge}`}>{selectedDetails.status}</span></div>
            <div><div style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>Méthode</div><div>{selectedDetails.method}</div></div>
          </div>
          {selectedDetails.status === 'Payé' && <div style={{ marginTop: 'var(--space-md)', display: 'flex', justifyContent: 'flex-end' }}><button className="btn btn-primary" onClick={() => handlePrintQuittance(selectedDetails)}><Printer size={16} /> Imprimer</button></div>}
        </div>)}
      </Modal>

      <Toast message={toastMessage} onClose={() => setToastMessage('')} />
    </div>
  )
}

export default Payments
