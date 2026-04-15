import { Router } from 'express'
import {
  getAccounts, createAccount, updateAccount, deleteAccount,
  getEntries, createEntry, updateEntry, validateEntry, deleteEntry,
  getLedger, getTrialBalance, getIncomeStatement, getBalanceSheet,
  getAccountingDashboard, syncFromOperations
} from '../controllers/accountingController.js'
import auth from '../middleware/auth.js'

const router = Router()

// Comptes
router.get('/accounts', auth, getAccounts)
router.post('/accounts', auth, createAccount)
router.put('/accounts/:id', auth, updateAccount)
router.delete('/accounts/:id', auth, deleteAccount)

// Écritures
router.get('/entries', auth, getEntries)
router.post('/entries', auth, createEntry)
router.put('/entries/:id', auth, updateEntry)
router.put('/entries/:id/validate', auth, validateEntry)
router.delete('/entries/:id', auth, deleteEntry)

// États et Rapports
router.get('/ledger', auth, getLedger)
router.get('/balance', auth, getTrialBalance)
router.get('/income-statement', auth, getIncomeStatement)
router.get('/balance-sheet', auth, getBalanceSheet)
router.get('/dashboard', auth, getAccountingDashboard)

// Synchronisation
router.post('/sync', auth, syncFromOperations)

export default router
