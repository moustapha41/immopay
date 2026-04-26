import { DataTypes } from 'sequelize'
import sequelize from '../config/db.js'

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
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
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'properties', key: 'id' },
  },
  propertyName: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  amount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  amountPaid: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('Payé', 'En retard', 'En attente', 'Partiel', 'En attente PayDunya'),
    defaultValue: 'En attente',
  },
  date: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW,
  },
  method: {
    type: DataTypes.STRING,
    defaultValue: '-',
  },
  quittance: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  period: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
}, {
  tableName: 'payments',
})

export default Payment
