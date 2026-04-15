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
  category: {
    type: DataTypes.ENUM('Résidentiel', 'Commercial', 'Terrain'),
    defaultValue: 'Résidentiel',
  },
  type: {
    type: DataTypes.STRING,
    defaultValue: 'Appartement',
  },
  status: {
    type: DataTypes.ENUM('Loué', 'Disponible', 'En travaux', 'Partiellement Loué', 'Complet'),
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
  // --- Hiérarchie ---
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  },
  maxTenants: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
}, {
  tableName: 'properties',
})

export default Property
