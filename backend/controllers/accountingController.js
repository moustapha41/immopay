import { Account, JournalEntry, Payment, Charge, Property } from '../models/index.js'
import { Op } from 'sequelize'
import sequelize from '../config/db.js'

// ==================== SEED PLAN COMPTABLE ====================
async function ensureDefaultAccounts() {
  // Idempotent seed: avoids race condition when multiple requests
  // hit accounting endpoints at the same time on a fresh database.
  await Account.bulkCreate(Account.SYSCOHADA_DEFAULTS, {
    ignoreDuplicates: true,
  })
}

// ==================== ACCOUNTS ====================
export async function getAccounts(req, res) {
  try {
    await ensureDefaultAccounts()
    const { type, search } = req.query
    const where = {}
    if (type) where.type = type
    if (search) {
      where[Op.or] = [
        { code: { [Op.iLike]: `%${search}%` } },
        { label: { [Op.iLike]: `%${search}%` } },
      ]
    }
    const accounts = await Account.findAll({ where, order: [['code', 'ASC']] })
    res.json(accounts)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function createAccount(req, res) {
  try {
    const existing = await Account.findOne({ where: { code: req.body.code } })
    if (existing) return res.status(400).json({ error: 'Ce numéro de compte existe déjà.' })
    const account = await Account.create(req.body)
    res.status(201).json(account)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function updateAccount(req, res) {
  try {
    const account = await Account.findByPk(req.params.id)
    if (!account) return res.status(404).json({ error: 'Compte non trouvé.' })
    await account.update(req.body)
    res.json(account)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function deleteAccount(req, res) {
  try {
    const account = await Account.findByPk(req.params.id)
    if (!account) return res.status(404).json({ error: 'Compte non trouvé.' })
    if (account.isSystem) return res.status(400).json({ error: 'Impossible de supprimer un compte système.' })
    
    const usedInEntries = await JournalEntry.count({
      where: { [Op.or]: [{ debitAccountId: account.id }, { creditAccountId: account.id }] }
    })
    if (usedInEntries > 0) return res.status(400).json({ error: 'Ce compte est utilisé dans des écritures comptables.' })
    
    await account.destroy()
    res.json({ message: 'Compte supprimé.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ==================== JOURNAL ENTRIES ====================
async function generateReference(t = null) {
  const year = new Date().getFullYear()
  const options = {
    where: { reference: { [Op.like]: `EC-${year}-%` } },
    order: [['id', 'DESC']],
  }
  if (t) options.transaction = t

  const lastEntry = await JournalEntry.findOne(options)
  let nextNum = 1
  if (lastEntry) {
    const parts = lastEntry.reference.split('-')
    nextNum = parseInt(parts[2]) + 1
  }
  return `EC-${year}-${String(nextNum).padStart(4, '0')}`
}

export async function getEntries(req, res) {
  try {
    const { journal, status, startDate, endDate, accountId, search } = req.query
    const where = {}
    if (journal) where.journal = journal
    if (status) where.status = status
    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] }
    } else if (startDate) {
      where.date = { [Op.gte]: startDate }
    } else if (endDate) {
      where.date = { [Op.lte]: endDate }
    }
    if (accountId) {
      where[Op.or] = [{ debitAccountId: accountId }, { creditAccountId: accountId }]
    }
    if (search) {
      const searchConditions = [
        { description: { [Op.iLike]: `%${search}%` } },
        { reference: { [Op.iLike]: `%${search}%` } },
      ]
      if (where[Op.or]) {
        // Merge with existing OR for accountId
        where[Op.and] = [{ [Op.or]: where[Op.or] }, { [Op.or]: searchConditions }]
        delete where[Op.or]
      } else {
        where[Op.or] = searchConditions
      }
    }
    const entries = await JournalEntry.findAll({ where, order: [['date', 'DESC'], ['id', 'DESC']] })
    res.json(entries)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function createEntry(req, res) {
  const t = await sequelize.transaction()
  try {
    const { debitAccountId, creditAccountId, amount, date, description, journal, propertyId } = req.body
    if (!debitAccountId || !creditAccountId || !amount) {
      return res.status(400).json({ error: 'Compte débit, crédit et montant requis.' })
    }
    if (debitAccountId === creditAccountId) {
      return res.status(400).json({ error: 'Les comptes débit et crédit doivent être différents.' })
    }

    const debitAccount = await Account.findByPk(debitAccountId, { transaction: t })
    const creditAccount = await Account.findByPk(creditAccountId, { transaction: t })
    if (!debitAccount || !creditAccount) {
      await t.rollback()
      return res.status(404).json({ error: 'Compte introuvable.' })
    }

    let propertyName = ''
    if (propertyId) {
      const property = await Property.findByPk(propertyId, { transaction: t })
      if (property) propertyName = property.title
    }

    const reference = await generateReference()
    const entry = await JournalEntry.create({
      reference,
      date: date || new Date().toISOString().split('T')[0],
      description,
      journal: journal || 'operations_diverses',
      debitAccountId,
      debitAccountCode: debitAccount.code,
      debitAccountLabel: debitAccount.label,
      creditAccountId,
      creditAccountCode: creditAccount.code,
      creditAccountLabel: creditAccount.label,
      amount: parseFloat(amount),
      source: 'manual',
      status: 'brouillon',
      propertyId: propertyId || null,
      propertyName,
      tenantName: req.body.tenantName || '',
    }, { transaction: t })

    await t.commit()
    res.status(201).json(entry)
  } catch (err) {
    await t.rollback()
    res.status(500).json({ error: err.message })
  }
}

export async function updateEntry(req, res) {
  try {
    const entry = await JournalEntry.findByPk(req.params.id)
    if (!entry) return res.status(404).json({ error: 'Écriture non trouvée.' })
    if (entry.status === 'validé') return res.status(400).json({ error: 'Impossible de modifier une écriture validée.' })

    const updates = { ...req.body }
    if (updates.debitAccountId) {
      const acc = await Account.findByPk(updates.debitAccountId)
      if (acc) { updates.debitAccountCode = acc.code; updates.debitAccountLabel = acc.label }
    }
    if (updates.creditAccountId) {
      const acc = await Account.findByPk(updates.creditAccountId)
      if (acc) { updates.creditAccountCode = acc.code; updates.creditAccountLabel = acc.label }
    }

    await entry.update(updates)
    res.json(entry)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function validateEntry(req, res) {
  const t = await sequelize.transaction()
  try {
    const entry = await JournalEntry.findByPk(req.params.id, { transaction: t })
    if (!entry) { await t.rollback(); return res.status(404).json({ error: 'Écriture non trouvée.' }) }
    if (entry.status === 'validé') { await t.rollback(); return res.status(400).json({ error: 'Déjà validée.' }) }

    const amount = parseFloat(entry.amount)

    // Update debit account balance
    const debitAccount = await Account.findByPk(entry.debitAccountId, { transaction: t })
    if (debitAccount) {
      const currentBal = parseFloat(debitAccount.balance) || 0
      // Actif/Charge: debit increases, Passif/Produit: debit decreases
      const newBal = (debitAccount.type === 'actif' || debitAccount.type === 'charge')
        ? currentBal + amount
        : currentBal - amount
      await debitAccount.update({ balance: newBal }, { transaction: t })
    }

    // Update credit account balance
    const creditAccount = await Account.findByPk(entry.creditAccountId, { transaction: t })
    if (creditAccount) {
      const currentBal = parseFloat(creditAccount.balance) || 0
      // Passif/Produit: credit increases, Actif/Charge: credit decreases
      const newBal = (creditAccount.type === 'passif' || creditAccount.type === 'produit')
        ? currentBal + amount
        : currentBal - amount
      await creditAccount.update({ balance: newBal }, { transaction: t })
    }

    await entry.update({ status: 'validé' }, { transaction: t })
    await t.commit()
    res.json(entry)
  } catch (err) {
    await t.rollback()
    res.status(500).json({ error: err.message })
  }
}

export async function deleteEntry(req, res) {
  try {
    const entry = await JournalEntry.findByPk(req.params.id)
    if (!entry) return res.status(404).json({ error: 'Écriture non trouvée.' })
    if (entry.status === 'validé') return res.status(400).json({ error: 'Impossible de supprimer une écriture validée.' })
    await entry.destroy()
    res.json({ message: 'Écriture supprimée.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ==================== GRAND LIVRE ====================
export async function getLedger(req, res) {
  try {
    const { accountId, startDate, endDate } = req.query
    if (!accountId) return res.status(400).json({ error: 'accountId requis.' })

    const account = await Account.findByPk(accountId)
    if (!account) return res.status(404).json({ error: 'Compte introuvable.' })

    const where = {
      status: 'validé',
      [Op.or]: [{ debitAccountId: accountId }, { creditAccountId: accountId }],
    }
    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] }
    }

    const entries = await JournalEntry.findAll({ where, order: [['date', 'ASC'], ['id', 'ASC']] })

    let runningBalance = 0
    const movements = entries.map(e => {
      const isDebit = e.debitAccountId === parseInt(accountId)
      const amount = parseFloat(e.amount)
      let debit = 0, credit = 0

      if (isDebit) {
        debit = amount
        if (account.type === 'actif' || account.type === 'charge') runningBalance += amount
        else runningBalance -= amount
      } else {
        credit = amount
        if (account.type === 'passif' || account.type === 'produit') runningBalance += amount
        else runningBalance -= amount
      }

      return {
        id: e.id,
        date: e.date,
        reference: e.reference,
        description: e.description,
        counterpart: isDebit ? `${e.creditAccountCode} — ${e.creditAccountLabel}` : `${e.debitAccountCode} — ${e.debitAccountLabel}`,
        debit,
        credit,
        balance: runningBalance,
      }
    })

    res.json({
      account: { id: account.id, code: account.code, label: account.label, type: account.type },
      movements,
      totalDebit: movements.reduce((s, m) => s + m.debit, 0),
      totalCredit: movements.reduce((s, m) => s + m.credit, 0),
      solde: runningBalance,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ==================== BALANCE ====================
export async function getTrialBalance(req, res) {
  try {
    const { startDate, endDate } = req.query
    const accounts = await Account.findAll({ order: [['code', 'ASC']] })

    const where = { status: 'validé' }
    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] }
    }
    const entries = await JournalEntry.findAll({ where })

    const balanceData = accounts.map(acc => {
      let totalDebit = 0
      let totalCredit = 0

      entries.forEach(e => {
        const amount = parseFloat(e.amount)
        if (e.debitAccountId === acc.id) totalDebit += amount
        if (e.creditAccountId === acc.id) totalCredit += amount
      })

      const soldeDebiteur = totalDebit > totalCredit ? totalDebit - totalCredit : 0
      const soldeCrediteur = totalCredit > totalDebit ? totalCredit - totalDebit : 0

      return {
        id: acc.id,
        code: acc.code,
        label: acc.label,
        type: acc.type,
        category: acc.category,
        totalDebit,
        totalCredit,
        soldeDebiteur,
        soldeCrediteur,
      }
    }).filter(a => a.totalDebit > 0 || a.totalCredit > 0)

    const totals = {
      totalDebit: balanceData.reduce((s, a) => s + a.totalDebit, 0),
      totalCredit: balanceData.reduce((s, a) => s + a.totalCredit, 0),
      totalSoldeDebiteur: balanceData.reduce((s, a) => s + a.soldeDebiteur, 0),
      totalSoldeCrediteur: balanceData.reduce((s, a) => s + a.soldeCrediteur, 0),
    }

    res.json({ accounts: balanceData, totals })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ==================== INCOME STATEMENT ====================
export async function getIncomeStatement(req, res) {
  try {
    const { startDate, endDate } = req.query
    const where = { status: 'validé' }
    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] }
    }

    const entries = await JournalEntry.findAll({ where })
    const accounts = await Account.findAll({ where: { type: { [Op.in]: ['produit', 'charge'] } }, order: [['code', 'ASC']] })

    const produits = []
    const charges = []

    accounts.forEach(acc => {
      let total = 0
      entries.forEach(e => {
        const amount = parseFloat(e.amount)
        if (acc.type === 'produit') {
          if (e.creditAccountId === acc.id) total += amount
          if (e.debitAccountId === acc.id) total -= amount
        } else {
          if (e.debitAccountId === acc.id) total += amount
          if (e.creditAccountId === acc.id) total -= amount
        }
      })
      if (total !== 0) {
        const item = { code: acc.code, label: acc.label, category: acc.category, amount: total }
        if (acc.type === 'produit') produits.push(item)
        else charges.push(item)
      }
    })

    const totalProduits = produits.reduce((s, p) => s + p.amount, 0)
    const totalCharges = charges.reduce((s, c) => s + c.amount, 0)
    const resultat = totalProduits - totalCharges

    res.json({ produits, charges, totalProduits, totalCharges, resultat })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ==================== BALANCE SHEET ====================
export async function getBalanceSheet(req, res) {
  try {
    const accounts = await Account.findAll({ where: { type: { [Op.in]: ['actif', 'passif'] } }, order: [['code', 'ASC']] })
    const entries = await JournalEntry.findAll({ where: { status: 'validé' } })

    const actifs = []
    const passifs = []

    accounts.forEach(acc => {
      let solde = 0
      entries.forEach(e => {
        const amount = parseFloat(e.amount)
        if (acc.type === 'actif') {
          if (e.debitAccountId === acc.id) solde += amount
          if (e.creditAccountId === acc.id) solde -= amount
        } else {
          if (e.creditAccountId === acc.id) solde += amount
          if (e.debitAccountId === acc.id) solde -= amount
        }
      })
      if (solde !== 0) {
        const item = { code: acc.code, label: acc.label, category: acc.category, amount: solde }
        if (acc.type === 'actif') actifs.push(item)
        else passifs.push(item)
      }
    })

    // Add result to passif side
    const chargeAccounts = await Account.findAll({ where: { type: 'charge' } })
    const produitAccounts = await Account.findAll({ where: { type: 'produit' } })
    let totalCharges = 0, totalProduits = 0
    chargeAccounts.forEach(acc => {
      entries.forEach(e => {
        const amount = parseFloat(e.amount)
        if (e.debitAccountId === acc.id) totalCharges += amount
        if (e.creditAccountId === acc.id) totalCharges -= amount
      })
    })
    produitAccounts.forEach(acc => {
      entries.forEach(e => {
        const amount = parseFloat(e.amount)
        if (e.creditAccountId === acc.id) totalProduits += amount
        if (e.debitAccountId === acc.id) totalProduits -= amount
      })
    })
    const resultat = totalProduits - totalCharges
    if (resultat !== 0) {
      if (resultat > 0) {
        passifs.push({ code: '120', label: 'Résultat de l\'exercice (bénéfice)', category: 'Capitaux', amount: resultat })
      } else {
        actifs.push({ code: '129', label: 'Résultat de l\'exercice (perte)', category: 'Capitaux', amount: Math.abs(resultat) })
      }
    }

    const totalActif = actifs.reduce((s, a) => s + a.amount, 0)
    const totalPassif = passifs.reduce((s, p) => s + p.amount, 0)

    res.json({ actifs, passifs, totalActif, totalPassif })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ==================== DASHBOARD ====================
export async function getAccountingDashboard(req, res) {
  try {
    await ensureDefaultAccounts()

    const entries = await JournalEntry.findAll({ where: { status: 'validé' } })
    const accounts = await Account.findAll()

    // Total produits & charges
    let totalProduits = 0, totalCharges = 0
    accounts.forEach(acc => {
      entries.forEach(e => {
        const amount = parseFloat(e.amount)
        if (acc.type === 'produit') {
          if (e.creditAccountId === acc.id) totalProduits += amount
          if (e.debitAccountId === acc.id) totalProduits -= amount
        }
        if (acc.type === 'charge') {
          if (e.debitAccountId === acc.id) totalCharges += amount
          if (e.creditAccountId === acc.id) totalCharges -= amount
        }
      })
    })

    // Trésorerie (521 + 571)
    const tresoAccounts = accounts.filter(a => ['521', '571'].includes(a.code))
    let tresorerie = 0
    tresoAccounts.forEach(acc => {
      entries.forEach(e => {
        const amount = parseFloat(e.amount)
        if (e.debitAccountId === acc.id) tresorerie += amount
        if (e.creditAccountId === acc.id) tresorerie -= amount
      })
    })

    // Créances locataires (411)
    const acc411 = accounts.find(a => a.code === '411')
    let creances = 0
    if (acc411) {
      entries.forEach(e => {
        const amount = parseFloat(e.amount)
        if (e.debitAccountId === acc411.id) creances += amount
        if (e.creditAccountId === acc411.id) creances -= amount
      })
    }

    // Monthly revenue chart (last 8 months)
    const months = []
    const now = new Date()
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
      const monthLabel = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })

      const monthEntries = entries.filter(e => e.date >= `${monthKey}-01` && e.date <= `${monthKey}-${lastDay}`)

      let mProduits = 0, mCharges = 0
      accounts.forEach(acc => {
        monthEntries.forEach(e => {
          const amount = parseFloat(e.amount)
          if (acc.type === 'produit') {
            if (e.creditAccountId === acc.id) mProduits += amount
            if (e.debitAccountId === acc.id) mProduits -= amount
          }
          if (acc.type === 'charge') {
            if (e.debitAccountId === acc.id) mCharges += amount
            if (e.creditAccountId === acc.id) mCharges -= amount
          }
        })
      })

      months.push({ month: monthLabel, produits: mProduits, charges: mCharges })
    }

    const totalEntries = await JournalEntry.count()
    const draftEntries = await JournalEntry.count({ where: { status: 'brouillon' } })

    res.json({
      resultatNet: totalProduits - totalCharges,
      totalProduits,
      totalCharges,
      tresorerie,
      creances,
      totalEntries,
      draftEntries,
      monthlyChart: months,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ==================== SYNC FROM PAYMENTS & CHARGES ====================
export async function runAccountingSync() {
  const t = await sequelize.transaction()
  try {
    await ensureDefaultAccounts()

    const accounts = await Account.findAll({ transaction: t })
    const acc521 = accounts.find(a => a.code === '521') // Banque
    const acc571 = accounts.find(a => a.code === '571') // Caisse
    const acc411 = accounts.find(a => a.code === '411') // Locataires
    const acc706 = accounts.find(a => a.code === '706') // Revenus locatifs
    const acc615 = accounts.find(a => a.code === '615') // Entretien
    const acc613 = accounts.find(a => a.code === '613') // Copropriété
    const acc616 = accounts.find(a => a.code === '616') // Assurance
    const acc631 = accounts.find(a => a.code === '631') // Impôts fonciers
    const acc614 = accounts.find(a => a.code === '614') // Charges locatives
    const acc707 = accounts.find(a => a.code === '707') // Charges récupérables

    if (!acc521 || !acc706 || !acc411) {
      await t.rollback()
      throw new Error('Plan comptable incomplet. Veuillez réinitialiser.')
    }

    let synced = 0

    // Sync payments
    const payments = await Payment.findAll({ where: { status: { [Op.in]: ['Payé', 'Partiel'] } }, transaction: t })
    for (const payment of payments) {
      const actualAmount = payment.amountPaid || payment.amount
      
      const exists = await JournalEntry.findOne({
        where: { source: 'payment', sourceId: payment.id },
        transaction: t,
      })
      if (exists) {
        if (parseFloat(exists.amount) !== actualAmount) {
          await exists.update({ amount: actualAmount }, { transaction: t })
          synced++
        }
        continue
      }

      const ref = await generateReference(t)
      const methodAccount = (payment.method === 'Espèces' && acc571) ? acc571 : acc521

      await JournalEntry.create({
        reference: ref,
        date: payment.date,
        description: `Loyer ${payment.period || ''} — ${payment.tenantName || 'Locataire'}`,
        journal: 'vente',
        debitAccountId: methodAccount.id,
        debitAccountCode: methodAccount.code,
        debitAccountLabel: methodAccount.label,
        creditAccountId: acc706.id,
        creditAccountCode: acc706.code,
        creditAccountLabel: acc706.label,
        amount: actualAmount,
        source: 'payment',
        sourceId: payment.id,
        status: 'validé',
        propertyId: payment.propertyId,
        propertyName: payment.propertyName || '',
        tenantName: payment.tenantName || '',
      }, { transaction: t })
      synced++
    }

    // Sync owner charges (paid)
    const ownerCharges = await Charge.findAll({
      where: { category: 'owner', status: 'Payé' },
      transaction: t,
    })
    for (const charge of ownerCharges) {
      const exists = await JournalEntry.findOne({
        where: { source: 'charge', sourceId: charge.id },
        transaction: t,
      })
      if (exists) continue

      // Determine charge account based on type
      let chargeAccount = acc615 // Default: entretien
      if (charge.type === 'Assurance') chargeAccount = acc616
      else if (charge.type === 'Taxe') chargeAccount = acc631
      else if (charge.type === 'Eau' || charge.type === 'Électricité') chargeAccount = acc613
      else if (charge.type === 'Travaux') chargeAccount = acc615

      const ref = await generateReference(t)
      await JournalEntry.create({
        reference: ref,
        date: charge.date || new Date().toISOString().split('T')[0],
        description: `${charge.label} — ${charge.propertyName || 'Bien'}`,
        journal: 'achat',
        debitAccountId: chargeAccount.id,
        debitAccountCode: chargeAccount.code,
        debitAccountLabel: chargeAccount.label,
        creditAccountId: acc521.id,
        creditAccountCode: acc521.code,
        creditAccountLabel: acc521.label,
        amount: charge.amount,
        source: 'charge',
        sourceId: charge.id,
        status: 'validé',
        propertyId: charge.propertyId,
        propertyName: charge.propertyName || '',
      }, { transaction: t })
      synced++
    }

    // Sync tenant charges (regularized)
    const tenantCharges = await Charge.findAll({
      where: { category: 'tenant', status: 'Régularisé' },
      transaction: t,
    })
    for (const charge of tenantCharges) {
      const exists = await JournalEntry.findOne({
        where: { source: 'charge_tenant', sourceId: charge.id },
        transaction: t,
      })
      if (exists) continue

      const ref = await generateReference(t)
      await JournalEntry.create({
        reference: ref,
        date: charge.date || new Date().toISOString().split('T')[0],
        description: `Charges récupérables — ${charge.label} — ${charge.tenantName || 'Locataire'}`,
        journal: 'vente',
        debitAccountId: acc411.id,
        debitAccountCode: acc411.code,
        debitAccountLabel: acc411.label,
        creditAccountId: acc707.id,
        creditAccountCode: acc707.code,
        creditAccountLabel: acc707.label,
        amount: charge.reel || charge.amount,
        source: 'charge_tenant',
        sourceId: charge.id,
        status: 'validé',
        propertyId: charge.propertyId,
        propertyName: charge.propertyName || '',
        tenantName: charge.tenantName || '',
      }, { transaction: t })
      synced++
    }

    // Recalculate all account balances
    const allAccounts = await Account.findAll({ transaction: t })
    const allEntries = await JournalEntry.findAll({ where: { status: 'validé' }, transaction: t })
    for (const acc of allAccounts) {
      let balance = 0
      allEntries.forEach(e => {
        const amount = parseFloat(e.amount)
        if (acc.type === 'actif' || acc.type === 'charge') {
          if (e.debitAccountId === acc.id) balance += amount
          if (e.creditAccountId === acc.id) balance -= amount
        } else {
          if (e.creditAccountId === acc.id) balance += amount
          if (e.debitAccountId === acc.id) balance -= amount
        }
      })
      await acc.update({ balance }, { transaction: t })
    }

    await t.commit()
    return synced
  } catch (err) {
    await t.rollback()
    throw err
  }
}

export async function syncFromOperations(req, res) {
  try {
    const synced = await runAccountingSync()
    res.json({ message: `Synchronisation terminée. ${synced} écriture(s) créée(s).`, synced })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
