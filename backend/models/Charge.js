import { DataTypes } from 'sequelize'
import sequelize from '../config/db.js'

const Charge = sequelize.define('Charge', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  category: {
    type: DataTypes.ENUM('tenant', 'owner'),
    defaultValue: 'tenant',
  },
  label: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    defaultValue: 'Eau',
  },
  period: {
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
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'tenants', key: 'id' },
  },
  tenantName: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  provision: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  reel: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  amount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'En attente',
  },
}, {
  tableName: 'charges',
})

export default Charge
