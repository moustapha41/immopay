import { DataTypes } from 'sequelize'
import sequelize from '../config/db.js'

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'system',
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  channel: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'in_app',
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'sent',
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'notifications',
})

export default Notification
