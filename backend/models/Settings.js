import { DataTypes } from 'sequelize'
import sequelize from '../config/db.js'

const Settings = sequelize.define('Settings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  agencyName: {
    type: DataTypes.STRING,
    defaultValue: 'ImmoSuite Sénégal',
  },
  ninea: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  address: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  city: {
    type: DataTypes.STRING,
    defaultValue: 'Dakar',
  },
  website: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  logoUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'XOF',
  },
  language: {
    type: DataTypes.STRING,
    defaultValue: 'FR',
  },
  dateFormat: {
    type: DataTypes.STRING,
    defaultValue: 'DD/MM/YYYY',
  },
  notifications: {
    type: DataTypes.JSON,
    defaultValue: {
      paymentReceived: { email: true, sms: true },
      newProspect: { email: true, sms: false },
      latePayment: { email: true, sms: true },
      interventionReq: { email: true, sms: false },
    },
  },
  profile: {
    type: DataTypes.JSON,
    defaultValue: {
      firstName: 'Abdoulaye',
      lastName: 'Diop',
      email: 'admin@immosuite.sn',
      phone: '+221 77 123 45 67',
    },
  },
}, {
  tableName: 'settings',
})

export default Settings
