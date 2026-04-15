import { DataTypes } from 'sequelize'
import sequelize from '../config/db.js'

const JournalEntry = sequelize.define('JournalEntry', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  reference: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  journal: {
    type: DataTypes.ENUM('achat', 'vente', 'banque', 'caisse', 'operations_diverses'),
    defaultValue: 'operations_diverses',
  },
  debitAccountId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'accounts', key: 'id' },
  },
  debitAccountCode: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  debitAccountLabel: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  creditAccountId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'accounts', key: 'id' },
  },
  creditAccountCode: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  creditAccountLabel: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  },
  source: {
    type: DataTypes.STRING,
    defaultValue: 'manual',
  },
  sourceId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('brouillon', 'validé'),
    defaultValue: 'brouillon',
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
  tenantName: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
}, {
  tableName: 'journal_entries',
})

export default JournalEntry
