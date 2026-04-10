import sequelize from '../config/db.js'
import User from './User.js'
import Property from './Property.js'
import Tenant from './Tenant.js'
import Prospect from './Prospect.js'
import Payment from './Payment.js'
import Charge from './Charge.js'
import Settings from './Settings.js'
import Notification from './Notification.js'

// Associations
Property.hasOne(Tenant, { foreignKey: 'propertyId', as: 'tenantInfo' })
Tenant.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' })

Tenant.hasMany(Payment, { foreignKey: 'tenantId', as: 'payments' })
Payment.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' })

Property.hasMany(Payment, { foreignKey: 'propertyId', as: 'payments' })
Payment.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' })

Property.hasMany(Charge, { foreignKey: 'propertyId', as: 'charges' })
Charge.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' })

Tenant.hasMany(Charge, { foreignKey: 'tenantId', as: 'charges' })
Charge.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' })

export { sequelize, User, Property, Tenant, Prospect, Payment, Charge, Settings, Notification }
