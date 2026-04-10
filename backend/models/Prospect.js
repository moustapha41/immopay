import { DataTypes } from 'sequelize'
import sequelize from '../config/db.js'

const Prospect = sequelize.define('Prospect', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  phone: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  status: {
    type: DataTypes.ENUM('Nouveau', 'Contact', 'Visite', 'Offre', 'Signé'),
    defaultValue: 'Nouveau',
  },
  source: {
    type: DataTypes.STRING,
    defaultValue: 'Site web',
  },
  score: {
    type: DataTypes.INTEGER,
    defaultValue: 50,
  },
  interest: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  date: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'prospects',
})

export default Prospect
