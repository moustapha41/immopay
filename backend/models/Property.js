import { DataTypes } from 'sequelize'
import sequelize from '../config/db.js'

const Property = sequelize.define('Property', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  address: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  city: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  type: {
    type: DataTypes.ENUM('Appartement', 'Villa', 'Studio', 'Bureau', 'Duplex'),
    defaultValue: 'Appartement',
  },
  status: {
    type: DataTypes.ENUM('Loué', 'Disponible', 'En travaux'),
    defaultValue: 'Disponible',
  },
  price: {
    type: DataTypes.STRING,
    defaultValue: '0',
  },
  surface: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  rooms: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  bedrooms: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  tenantName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'properties',
})

export default Property
