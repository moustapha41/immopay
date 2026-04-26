import { useState, useEffect } from 'react'
import {
  BookOpen, TrendingUp, TrendingDown, DollarSign, Wallet,
  Scale, FileText, Download, Plus, CheckCircle, RefreshCw, BarChart2
} from 'lucide-react'
import { accounting, properties as propertiesApi } from '../api'
import Modal from '../components/Modal'
import Toast from '../components/Toast'

function formatFCFA(amount) {
  return (amount || 0).toLocaleString('fr-FR') + ' FCFA'
}

export default function Accounting() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [dashboard, setDashboard] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [entries, setEntries] = useState([])
  const [ledger, setLedger] = useState(null)
  const [trialBalance, setTrialBalance] = useState(null)
  const [incomeStatement, setIncomeStatement] = useState(null)
  const [balanceSheet, setBalanceSheet] = useState(null)
  
  const [toastMessage, setToastMessage] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  
  // Form resources
  const [allProperties, setAllProperties] = useState([])

  useEffect(() => {
    loadDashboard()
    accounting.getAccounts().then(setAccounts)
    propertiesApi.getAll().then(setAllProperties)
  }, [])

  useEffect(() => {
    if (activeTab === 'entries') loadEntries()
    if (activeTab === 'ledger' && selectedAccountId) loadLedger()
    if (activeTab === 'balance') loadTrialBalance()
    if (activeTab === 'statements') {
      loadIncomeStatement()
      loadBalanceSheet()
    }
  }, [activeTab, selectedAccountId])

  const loadDashboard = async () => {
    try { const data = await accounting.getDashboard(); setDashboard(data) }
    catch (err) { /* silent */ }
  }

  const loadEntries = async () => {
    try { const data = await accounting.getEntries(); setEntries(data) }
    catch (err) { /* silent */ }
  }

  const loadLedger = async () => {
    if (!selectedAccountId) return
    try { const data = await accounting.getLedger({ accountId: selectedAccountId }); setLedger(data) }
    catch (err) { /* silent */ }
  }

  const loadTrialBalance = async () => {
    try { const data = await accounting.getTrialBalance(); setTrialBalance(data) }
    catch (err) { /* silent */ }
  }

  const loadIncomeStatement = async () => {
    try { const data = await accounting.getIncomeStatement(); setIncomeStatement(data) }
    catch (err) { /* silent */ }
  }

  const loadBalanceSheet = async () => {
    try { const data = await accounting.getBalanceSheet(); setBalanceSheet(data) }
    catch (err) { /* silent */ }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const res = await accounting.syncOperations()
      setToastMessage(res.message)
      loadDashboard()
      if (activeTab === 'entries') loadEntries()
    } catch (err) {
      setToastMessage(`Erreur: ${err.message}`)
    }
    setIsSyncing(false)
    setTimeout(() => setToastMessage(''), 4000)
  }

  const handleValidateEntry = async (id) => {
    try {
      await accounting.validateEntry(id)
      setToastMessage('Écriture validée.')
      loadEntries()
      loadDashboard()
    } catch (err) {
      setToastMessage(`Erreur: ${err.message}`)
    }
    setTimeout(() => setToastMessage(''), 3000)
  }

  const handleCreateEntry = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const data = {
      date: formData.get('date'),
      description: formData.get('description'),
      debitAccountId: formData.get('debitAccountId'),
      creditAccountId: formData.get('creditAccountId'),
      amount: formData.get('amount'),
      journal: formData.get('journal'),
      propertyId: formData.get('propertyId') || null,
    }
    try {
      await accounting.createEntry(data)
      setToastMessage('Écriture enregistrée en brouillon.')
      setIsEntryModalOpen(false)
      loadEntries()
    } catch (err) {
      setToastMessage(`Erreur: ${err.message}`)
    }
    setTimeout(() => setToastMessage(''), 3000)
  }

  return (
    <div className="animate-fade-in accounting-module">
      <div className="page-header accounting-header">
        <div>
          <h1>Comptabilité</h1>
          <p>Gestion comptable SYSCOHADA et états financiers automatiques</p>
        </div>
        <div className="accounting-header-actions">
          <button 
            className="btn btn-ghost" 
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw size={16} className={isSyncing ? 'spin' : ''} /> 
            {isSyncing ? 'Sync...' : 'Sync Paiements'}
          </button>
          <button className="btn btn-primary" onClick={() => setIsEntryModalOpen(true)}>
            <Plus size={16} /> Écriture manuelle
          </button>
        </div>
      </div>

      <div className="tabs tabs-secondary accounting-tabs" style={{ marginBottom: 'var(--space-xl)' }}>
        <button className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          <BarChart2 size={16} style={{marginRight: 6}}/> Dashboard
        </button>
        <button className={`tab ${activeTab === 'entries' ? 'active' : ''}`} onClick={() => setActiveTab('entries')}>
          <BookOpen size={16} style={{marginRight: 6}}/> Écritures
        </button>
        <button className={`tab ${activeTab === 'ledger' ? 'active' : ''}`} onClick={() => setActiveTab('ledger')}>
          <FileText size={16} style={{marginRight: 6}}/> Grand Livre
        </button>
        <button className={`tab ${activeTab === 'balance' ? 'active' : ''}`} onClick={() => setActiveTab('balance')}>
          <Scale size={16} style={{marginRight: 6}}/> Balance
        </button>
        <button className={`tab ${activeTab === 'statements' ? 'active' : ''}`} onClick={() => setActiveTab('statements')}>
          <TrendingUp size={16} style={{marginRight: 6}}/> États Financiers
        </button>
      </div>

      {activeTab === 'dashboard' && dashboard && (
        <div className="stagger">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-icon blue"><TrendingUp size={22} /></div>
              <div className="stat-card-value">{formatFCFA(dashboard.resultatNet)}</div>
              <div className="stat-card-label">Résultat Net</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon green"><DollarSign size={22} /></div>
              <div className="stat-card-value">{formatFCFA(dashboard.tresorerie)}</div>
              <div className="stat-card-label">Trésorerie Disponible</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon gold"><Wallet size={22} /></div>
              <div className="stat-card-value">{formatFCFA(dashboard.creances)}</div>
              <div className="stat-card-label">Créances Locataires</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon red"><BookOpen size={22} /></div>
              <div className="stat-card-value">{dashboard.draftEntries}</div>
              <div className="stat-card-label">Écritures en brouillon</div>
            </div>
          </div>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 'var(--space-lg)' }}>Résumé d'exploitation</h3>
            <table className="data-table">
              <thead><tr><th>Période</th><th>Produits (Revenus)</th><th>Charges (Dépenses)</th><th>Résultat</th></tr></thead>
              <tbody>
                {dashboard.monthlyChart.map((m, i) => (
                  <tr key={i}>
                    <td style={{fontWeight: 600}}>{m.month}</td>
                    <td style={{color: 'var(--success)'}}>{formatFCFA(m.produits)}</td>
                    <td style={{color: 'var(--danger)'}}>{formatFCFA(m.charges)}</td>
                    <td style={{fontWeight: 700, color: m.produits - m.charges >= 0 ? 'var(--success)' : 'var(--danger)'}}>
                      {formatFCFA(m.produits - m.charges)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'entries' && (
        <div className="card animate-fade-in">
          <div className="card-header">
            <h3 className="card-title">Journal des écritures</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th><th>Référence</th><th>Description</th>
                <th>Compte Débit</th><th>Compte Crédit</th>
                <th style={{textAlign: 'right'}}>Montant</th><th>Statut</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id}>
                  <td>{e.date}</td>
                  <td style={{fontWeight: 600}}>{e.reference}</td>
                  <td>{e.description}</td>
                  <td><span className="badge badge-primary">{e.debitAccountCode}</span> {e.debitAccountLabel}</td>
                  <td><span className="badge badge-gold">{e.creditAccountCode}</span> {e.creditAccountLabel}</td>
                  <td style={{textAlign: 'right', fontWeight: 600}}>{formatFCFA(e.amount)}</td>
                  <td>
                    <span className={`badge ${e.status === 'validé' ? 'badge-success' : 'badge-warning'}`}>
                      {e.status}
                    </span>
                  </td>
                  <td>
                    {e.status === 'brouillon' && (
                      <button className="icon-btn" title="Valider" onClick={() => handleValidateEntry(e.id)}>
                        <CheckCircle size={15} color="var(--success)"/>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'ledger' && (
        <div className="card animate-fade-in">
          <div className="card-header" style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
            <h3 className="card-title">Grand Livre</h3>
            <select 
              value={selectedAccountId} 
              onChange={e => setSelectedAccountId(e.target.value)}
              style={{ width: '300px' }}
            >
              <option value="">Sélectionner un compte...</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.code} — {a.label}</option>
              ))}
            </select>
          </div>
          
          {ledger && (
            <div>
              <div style={{ display: 'flex', gap: 'var(--space-xl)', marginBottom: 'var(--space-lg)', padding: 'var(--space-md)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
                <div>Total Débit: <strong style={{color: 'var(--success)'}}>{formatFCFA(ledger.totalDebit)}</strong></div>
                <div>Total Crédit: <strong style={{color: 'var(--danger)'}}>{formatFCFA(ledger.totalCredit)}</strong></div>
                <div>Solde final: <strong>{formatFCFA(ledger.solde)}</strong></div>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th><th>Réf</th><th>Libellé</th><th>Contrepartie</th>
                    <th style={{textAlign: 'right'}}>Débit</th><th style={{textAlign: 'right'}}>Crédit</th><th style={{textAlign: 'right'}}>Solde Prog.</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.movements.map(m => (
                    <tr key={m.id}>
                      <td>{m.date}</td>
                      <td>{m.reference}</td>
                      <td>{m.description}</td>
                      <td style={{fontSize: 'var(--font-xs)', color: 'var(--text-secondary)'}}>{m.counterpart}</td>
                      <td style={{textAlign: 'right', color: 'var(--success)'}}>{m.debit > 0 ? formatFCFA(m.debit) : ''}</td>
                      <td style={{textAlign: 'right', color: 'var(--danger)'}}>{m.credit > 0 ? formatFCFA(m.credit) : ''}</td>
                      <td style={{textAlign: 'right', fontWeight: 600}}>{formatFCFA(m.balance)}</td>
                    </tr>
                  ))}
                  {ledger.movements.length === 0 && (
                    <tr><td colSpan="7" style={{textAlign: 'center', color: 'var(--text-muted)'}}>Aucun mouvement validé pour ce compte.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'balance' && trialBalance && (
        <div className="card animate-fade-in">
          <div className="card-header">
            <h3 className="card-title">Balance des Comptes</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Compte</th>
                <th style={{textAlign: 'right'}}>Mouvements Débit</th>
                <th style={{textAlign: 'right'}}>Mouvements Crédit</th>
                <th style={{textAlign: 'right'}}>Solde Débiteur</th>
                <th style={{textAlign: 'right'}}>Solde Créditeur</th>
              </tr>
            </thead>
            <tbody>
              {trialBalance.accounts.map(acc => (
                <tr key={acc.id}>
                  <td><strong>{acc.code}</strong> — {acc.label}</td>
                  <td style={{textAlign: 'right'}}>{acc.totalDebit > 0 ? formatFCFA(acc.totalDebit) : ''}</td>
                  <td style={{textAlign: 'right'}}>{acc.totalCredit > 0 ? formatFCFA(acc.totalCredit) : ''}</td>
                  <td style={{textAlign: 'right', color: 'var(--success)', fontWeight: 600}}>{acc.soldeDebiteur > 0 ? formatFCFA(acc.soldeDebiteur) : ''}</td>
                  <td style={{textAlign: 'right', color: 'var(--danger)', fontWeight: 600}}>{acc.soldeCrediteur > 0 ? formatFCFA(acc.soldeCrediteur) : ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--bg-glass)', fontWeight: 'bold' }}>
                <td style={{textAlign: 'right'}}>TOTAUX</td>
                <td style={{textAlign: 'right'}}>{formatFCFA(trialBalance.totals.totalDebit)}</td>
                <td style={{textAlign: 'right'}}>{formatFCFA(trialBalance.totals.totalCredit)}</td>
                <td style={{textAlign: 'right'}}>{formatFCFA(trialBalance.totals.totalSoldeDebiteur)}</td>
                <td style={{textAlign: 'right'}}>{formatFCFA(trialBalance.totals.totalSoldeCrediteur)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {activeTab === 'statements' && incomeStatement && balanceSheet && (
        <div className="grid-2 animate-fade-in">
          <div className="card">
            <div className="card-header"><h3 className="card-title">Compte de Résultat</h3></div>
            
            <h4 style={{padding: 'var(--space-sm) 0', color: 'var(--success)'}}>Produits (Revenus)</h4>
            <div style={{display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)'}}>
              {incomeStatement.produits.map(p => (
                <div key={p.code} style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 4}}>
                  <span>{p.code} - {p.label}</span>
                  <strong>{formatFCFA(p.amount)}</strong>
                </div>
              ))}
              <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-sm)', fontSize: 'var(--font-lg)', fontWeight: 'bold', color: 'var(--success)'}}>
                <span>Total Produits</span>
                <span>{formatFCFA(incomeStatement.totalProduits)}</span>
              </div>
            </div>

            <h4 style={{padding: 'var(--space-sm) 0', marginTop: 'var(--space-lg)', color: 'var(--danger)'}}>Charges (Dépenses)</h4>
            <div style={{display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)'}}>
              {incomeStatement.charges.map(c => (
                <div key={c.code} style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 4}}>
                  <span>{c.code} - {c.label}</span>
                  <strong>{formatFCFA(c.amount)}</strong>
                </div>
              ))}
              <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-sm)', fontSize: 'var(--font-lg)', fontWeight: 'bold', color: 'var(--danger)'}}>
                <span>Total Charges</span>
                <span>{formatFCFA(incomeStatement.totalCharges)}</span>
              </div>
            </div>

            <div style={{marginTop: 'var(--space-2xl)', padding: 'var(--space-lg)', background: incomeStatement.resultat >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)', borderRadius: 'var(--radius-md)'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-xl)', fontWeight: 'bold'}}>
                <span>Résultat Net</span>
                <span style={{color: incomeStatement.resultat >= 0 ? 'var(--success)' : 'var(--danger)'}}>
                  {formatFCFA(incomeStatement.resultat)}
                </span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3 className="card-title">Bilan Simplifié</h3></div>
            
            <h4 style={{padding: 'var(--space-sm) 0', color: 'var(--accent-primary)'}}>Actif (Emplois)</h4>
            <div style={{display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)'}}>
              {balanceSheet.actifs.map(a => (
                <div key={a.code} style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 4}}>
                  <span>{a.code} - {a.label}</span>
                  <strong>{formatFCFA(a.amount)}</strong>
                </div>
              ))}
              <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-sm)', fontSize: 'var(--font-lg)', fontWeight: 'bold', color: 'var(--accent-primary)'}}>
                <span>Total Actif</span>
                <span>{formatFCFA(balanceSheet.totalActif)}</span>
              </div>
            </div>

            <h4 style={{padding: 'var(--space-sm) 0', marginTop: 'var(--space-lg)', color: 'var(--accent-gold)'}}>Passif (Ressources)</h4>
            <div style={{display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)'}}>
              {balanceSheet.passifs.map(p => (
                <div key={p.code} style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 4}}>
                  <span>{p.code} - {p.label} <span style={{fontSize: '0.7em', color: 'var(--text-muted)'}}>({p.category})</span></span>
                  <strong>{formatFCFA(p.amount)}</strong>
                </div>
              ))}
              <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-sm)', fontSize: 'var(--font-lg)', fontWeight: 'bold', color: 'var(--accent-gold)'}}>
                <span>Total Passif</span>
                <span>{formatFCFA(balanceSheet.totalPassif)}</span>
              </div>
            </div>
            
            {balanceSheet.totalActif !== balanceSheet.totalPassif && (
              <div style={{marginTop: 'var(--space-md)', color: 'var(--danger)', fontSize: 'var(--font-sm)', fontWeight: 600}}>
                ⚠️ Le bilan n'est pas équilibré (écart: {formatFCFA(Math.abs(balanceSheet.totalActif - balanceSheet.totalPassif))}).
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Écriture */}
      <Modal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        title="Saisie comptable (Écriture manuelle)"
        maxWidth="860px"
      >
        <form className="accounting-entry-form" onSubmit={handleCreateEntry}>
          <div className="accounting-entry-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label>Date</label>
              <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label>Journal</label>
              <select name="journal" required>
                <option value="operations_diverses">Opérations Diverses</option>
                <option value="banque">Banque</option>
                <option value="caisse">Caisse</option>
                <option value="achat">Achats</option>
                <option value="vente">Ventes</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / -1' }}>
              <label>Libellé / Description</label>
              <input type="text" name="description" required placeholder="Description de l'opération" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label>Compte à Débiter</label>
              <select name="debitAccountId" required>
                <option value="">Sélectionner...</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label>Compte à Créditer</label>
              <select name="creditAccountId" required>
                <option value="">Sélectionner...</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label>Montant (FCFA)</label>
              <input type="number" name="amount" required min="1" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label>Bien lié (Optionnel)</label>
              <select name="propertyId">
                <option value="">Aucun</option>
                {allProperties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
          </div>
          <div className="accounting-entry-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setIsEntryModalOpen(false)}>Annuler</button>
            <button type="submit" className="btn btn-primary">Créer l'écriture</button>
          </div>
        </form>
      </Modal>

      <Toast message={toastMessage} onClose={() => setToastMessage('')} />
    </div>
  )
}
