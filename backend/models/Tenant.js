import { DataTypes } from 'sequelize'
import sequelize from '../config/db.js'
import crypto from 'crypto'

const Tenant = sequelize.define('Tenant', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  email: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  idType: {
    type: DataTypes.STRING,
    defaultValue: 'CNI',
  },
  idNumber: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'properties', key: 'id' },
  },
  propertyName: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  bailNumber: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  dateEntree: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  dateFinBail: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  depositAmount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  depositStatus: {
    type: DataTypes.STRING,
    defaultValue: 'Encaissé',
  },
  rent: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  documents: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'Actif',
  },
  token: {
    type: DataTypes.STRING,
    unique: true,
  },
}, {
  tableName: 'tenants',
  hooks: {
    beforeCreate: (tenant) => {
      if (!tenant.token) {
        tenant.token = crypto.randomBytes(16).toString('hex').toUpperCase()
      }
      if (!tenant.bailNumber) {
        const year = new Date().getFullYear()
        const rand = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')
        tenant.bailNumber = `BAIL-${year}-${rand}`
      }
    },
  },
})

export default Tenant
