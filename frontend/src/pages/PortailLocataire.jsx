import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  CreditCard, CheckCircle2, AlertTriangle, FileText,
  Clock, Download, Building2, MapPin, Loader2, ShieldCheck
} from 'lucide-react'
import { portal } from '../api'

function formatFCFA(amount) { return (amount || 0).toLocaleString('fr-FR') + ' FCFA' }

export default function PortailLocataire() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [isPaying, setIsPaying] = useState(false)
  const [payAmount, setPayAmount] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [agencySettings, setAgencySettings] = useState({})

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const paymentStatus = urlParams.get('payment')

    const initialize = async () => {
      try {
        if (paymentStatus === 'success') {
          // Validation de sécurité ou fallback manuel (pratique pour tests webhooks bloqués)
          await portal.verifyManual(token).catch(e => console.log('Auto-verify error:', e))
          // Nettoyer l'URL
          window.history.replaceState({}, document.title, window.location.pathname)
        } else if (paymentStatus === 'cancel') {
          setError("Le paiement a été annulé.")
          window.history.replaceState({}, document.title, window.location.pathname)
        }

        const [d, s] = await Promise.all([
          portal.getData(token),
          Promise.resolve({})
        ])
        if (d.error) { setError(d.error) }
        else { setData(d); setPayAmount(d.resteAPayer) }
        setAgencySettings(s || {})
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    initialize()
  }, [token])

  const handlePayment = async (e) => {
    e.preventDefault()
    setIsPaying(true)
    setError('')
    try {
      const response = await portal.paytechInit(token, payAmount)
      if (response.checkout_url) {
        window.location.href = response.checkout_url
      } else if (response.error) {
        const detailsMessage = response.details?.response_text
        setError(detailsMessage || response.error)
        setIsPaying(false)
      }
    } catch (err) { 
      setError('Erreur de connexion avec PayTech: ' + err.message)
      setIsPaying(false)
    }
  }

  const handlePrintQuittance = (item) => {
    const agencyName = agencySettings.agencyName || agencySettings.companyName || 'ImmoSuite Sénégal'
    const agencyLogo = agencySettings.logoUrl || ''
    const logoHtml = agencyLogo ? `<img src="${agencyLogo}" style="max-height: 60px; max-width: 150px;" />` : ''
    
    const html = `<div style="font-family: Arial; padding: 40px; max-width: 800px; margin: 0 auto; color: #1e3a5f;">
      <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #1e3a5f; padding-bottom: 20px; margin-bottom: 40px; align-items: center;">
        <div><h1 style="margin: 0; color: #d4a843;">QUITTANCE DE LOYER</h1></div>
        <div style="text-align: right;">${logoHtml}<h2 style="margin: 8px 0 0 0; font-size: 18px;">${agencyName}</h2><p style="color: #64748b; margin: 4px 0 0 0;">Édité le ${new Date().toLocaleDateString('fr-FR')}</p></div>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
        <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; width: 45%;"><p style="font-size: 12px; font-weight: bold; color: #64748b; margin-top: 0;">LOCATAIRE</p><p style="font-size: 18px; font-weight: bold; margin: 0;">${data.tenant?.firstName} ${data.tenant?.lastName}</p></div>
        <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; width: 45%;"><p style="font-size: 12px; font-weight: bold; color: #64748b; margin-top: 0;">BIEN</p><p style="margin: 0;">${data.tenant?.propertyName || 'Bien'}</p></div>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;"><tr style="border-bottom: 1px solid #cbd5e1;"><th style="text-align: left; padding: 12px 0;">Désignation</th><th>Période</th><th style="text-align: right;">Montant</th></tr><tr><td style="padding: 12px 0;">Loyer + Charges</td><td>${item.month}</td><td style="text-align: right; font-weight: bold;">${formatFCFA(item.amount)}</td></tr></table>
      <div style="background: #e0f2fe; padding: 20px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;"><div><p style="margin: 0; font-weight: bold;">Paiement reçu</p><p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b;">Méthode: ${item.method || 'PayDunya'}</p></div><div style="font-size: 24px; font-weight: bold; color: #d4a843;">${formatFCFA(item.amount)}</div></div>
    </div>`
    const w = window.open('', '_blank')
    w.document.write(`<html><head><title>Quittance - ${data.tenant?.firstName} ${data.tenant?.lastName}</title></head><body onload="window.print(); window.close();">${html}</body></html>`)
    w.document.close()
  }

  const styles = {
    container: { minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Inter, sans-serif', padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', alignItems: 'center' },
    wrapper: { width: '100%', maxWidth: '500px', margin: '0 auto', animation: 'fadeInUp 0.4s ease-out forwards' },
    card: { backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(30,58,95,0.08)', padding: '24px', marginBottom: '24px' },
    sectionTitle: { fontSize: '16px', fontWeight: '600', color: '#1e3a5f', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' },
    row: { display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' },
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'Complet': return { bg: '#dcfce7', text: '#16a34a', icon: <CheckCircle2 size={16} /> }
      case 'Partiel': return { bg: '#fef3c7', text: '#d97706', icon: <Clock size={16} /> }
      case 'En retard': return { bg: '#fee2e2', text: '#dc2626', icon: <AlertTriangle size={16} /> }
      default: return { bg: '#f1f5f9', text: '#64748b', icon: <AlertTriangle size={16} /> }
    }
  }

  if (loading) return <div style={styles.container}><div style={{ color: '#64748b', marginTop: 100 }}>Chargement...</div></div>
  if (error) return <div style={styles.container}><div style={{ ...styles.card, maxWidth: 500, margin: '100px auto', textAlign: 'center' }}><AlertTriangle size={40} color="#ef4444" style={{ margin: '0 auto 16px' }} /><h2 style={{ color: '#1e3a5f' }}>Portail Inaccessible</h2><p style={{ color: '#64748b' }}>{error}</p></div></div>
  if (!data) return null

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)', paddingTop: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#1e3a5f', fontWeight: '800', fontSize: '24px', marginBottom: '8px' }}>
            <Building2 size={28} color="#d4a843" /> ImmoSuite
          </div>
          <div style={{ color: '#64748b', fontSize: '13px' }}>Portail Locataire Sécurisé</div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#1e3a5f', margin: '16px 0 4px 0' }}>Bonjour, {data.name}</h1>
          <div style={{ color: '#64748b', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><MapPin size={14} /> {data.property}</div>
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}><FileText size={18} color="#d4a843" /> Loyer en cours</h2>
          <div style={{ backgroundColor: '#f1f5f9', borderRadius: '12px', padding: '20px', textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: '700', color: '#64748b', letterSpacing: '0.5px' }}>Reste à payer</div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#1e3a5f', margin: '8px 0' }}>{formatFCFA(data.resteAPayer)}</div>
            {data.resteAPayer === 0 ? (
              <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', backgroundColor: '#dcfce7', color: '#16a34a' }}><CheckCircle2 size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4 }}/>Loyer payé</div>
            ) : data.montantPaye > 0 ? (
              <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', backgroundColor: '#fef3c7', color: '#d97706' }}>Paiement partiel</div>
            ) : (
              <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', backgroundColor: '#fee2e2', color: '#dc2626' }}>En attente</div>
            )}
          </div>

          <div style={{ fontSize: '14px', color: '#475569' }}>
            <div style={styles.row}><span>Loyer de base</span><span style={{ fontWeight: 600 }}>{formatFCFA(data.loyerDeBase)}</span></div>
            <div style={styles.row}><span>Total attendu</span><span style={{ fontWeight: 700, color: '#1e3a5f' }}>{formatFCFA(data.totalAttendu)}</span></div>
            {data.montantPaye > 0 && <div style={{ ...styles.row, color: '#16a34a' }}><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={16}/> Déjà réglé</span><span style={{ fontWeight: 700 }}>- {formatFCFA(data.montantPaye)}</span></div>}
          </div>

          {data.resteAPayer > 0 && (
            <div style={{ marginTop: '24px' }}>
              <form onSubmit={handlePayment}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: 8 }}>Montant (FCFA)</label>
                <input type="number" style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px', marginBottom: '16px', textAlign: 'center', fontWeight: '600', color: '#1e3a5f' }}
                  value={payAmount} onChange={e => setPayAmount(Number(e.target.value))} min="1000" max={data.resteAPayer} required />
                <button type="submit" disabled={isPaying || payAmount === 0} style={{
                  width: '100%', backgroundColor: '#d4a843', color: '#ffffff', border: 'none', padding: '16px', borderRadius: '12px',
                  fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  cursor: isPaying ? 'wait' : 'pointer', boxShadow: '0 4px 15px rgba(212,168,67,0.3)', opacity: isPaying ? 0.7 : 1
                }}>
                  {isPaying ? <><Loader2 size={20} className="animate-spin" /> Connexion sécurisée...</> : <><CreditCard size={20} /> Payer</>}
                </button>
              </form>
              <div style={{ textAlign: 'center', marginTop: 12, fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><ShieldCheck size={14} /> Transactions protégées</div>
            </div>
          )}
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}><Clock size={18} color="#1e3a5f" /> Historique des paiements</h2>
          <div>
            {(data.history || []).map((item, i) => {
              const sc = getStatusColor(item.status)
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#1e3a5f', marginBottom: 4 }}>{item.month}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px', backgroundColor: sc.bg, color: sc.text, display: 'flex', alignItems: 'center', gap: 4 }}>{sc.icon} {item.status}</span>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{item.date || '-'}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: '15px' }}>{formatFCFA(item.amount)}<span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '12px', marginLeft: 4 }}>/ {formatFCFA(item.total).replace(' FCFA', '')}</span></div>
                    {item.status === 'Complet' && <button onClick={() => handlePrintQuittance(item)} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '12px', fontWeight: 600, marginTop: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', width: '100%' }}><Download size={12} /> Quittance</button>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
