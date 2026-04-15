import sequelize from '../config/db.js'
import User from './User.js'
import Property from './Property.js'
import Tenant from './Tenant.js'
import Prospect from './Prospect.js'
import Payment from './Payment.js'
import Charge from './Charge.js'
import Settings from './Settings.js'
import Notification from './Notification.js'
import Account from './Account.js'
import JournalEntry from './JournalEntry.js'
import Lease from './Lease.js'

// ==================== PROPERTY HIERARCHY (Parent ↔ Enfants) ====================
Property.hasMany(Property, { foreignKey: 'parentId', as: 'children', constraints: false })
Property.belongsTo(Property, { foreignKey: 'parentId', as: 'parent', constraints: false })

// ==================== LEASES ====================
Property.hasMany(Lease, { foreignKey: 'propertyId', as: 'leases' })
Lease.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' })

Tenant.hasMany(Lease, { foreignKey: 'tenantId', as: 'leases' })
Lease.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' })

// ==================== LEGACY: Property ↔ Tenant (rétrocompatibilité) ====================
Property.hasOne(Tenant, { foreignKey: 'propertyId', as: 'tenantInfo' })
Tenant.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' })

// ==================== PAYMENTS ====================
Tenant.hasMany(Payment, { foreignKey: 'tenantId', as: 'payments' })
Payment.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' })

Property.hasMany(Payment, { foreignKey: 'propertyId', as: 'payments' })
Payment.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' })

// ==================== CHARGES ====================
Property.hasMany(Charge, { foreignKey: 'propertyId', as: 'charges' })
Charge.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' })

Tenant.hasMany(Charge, { foreignKey: 'tenantId', as: 'charges' })
Charge.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' })

// ==================== ACCOUNTING ====================
Account.hasMany(JournalEntry, { foreignKey: 'debitAccountId', as: 'debitEntries' })
JournalEntry.belongsTo(Account, { foreignKey: 'debitAccountId', as: 'debitAccount' })

Account.hasMany(JournalEntry, { foreignKey: 'creditAccountId', as: 'creditEntries' })
JournalEntry.belongsTo(Account, { foreignKey: 'creditAccountId', as: 'creditAccount' })

Property.hasMany(JournalEntry, { foreignKey: 'propertyId', as: 'journalEntries' })
JournalEntry.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' })

export { sequelize, User, Property, Tenant, Prospect, Payment, Charge, Settings, Notification, Account, JournalEntry, Lease }
