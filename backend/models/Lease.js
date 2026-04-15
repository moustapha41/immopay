import { DataTypes } from 'sequelize'
import sequelize from '../config/db.js'
import crypto from 'crypto'

const Lease = sequelize.define('Lease', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tenants', key: 'id' },
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'properties', key: 'id' },
  },
  rent: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Loyer mensuel en FCFA',
  },
  depositAmount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Caution versée en FCFA',
  },
  depositStatus: {
    type: DataTypes.STRING,
    defaultValue: 'Encaissé',
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Date de fin du bail, null = indéterminée',
  },
  status: {
    type: DataTypes.ENUM('Actif', 'Résilié', 'Expiré'),
    defaultValue: 'Actif',
  },
  bailNumber: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  floor: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Étage loué (RDC, R+1, R+2, etc.) pour les immeubles',
  },
}, {
  tableName: 'leases',
  hooks: {
    beforeCreate: async (lease, options) => {
      if (!lease.bailNumber) {
        const year = new Date().getFullYear()
        
        // Find the latest lease for this year
        const latestLease = await Lease.findOne({
          where: {
            bailNumber: {
              [sequelize.Sequelize.Op.like]: `BAIL-${year}-%`
            }
          },
          order: [['id', 'DESC']],
          attributes: ['bailNumber'],
          transaction: options.transaction
        });

        let nextNumber = 1;
        if (latestLease && latestLease.bailNumber) {
          const parts = latestLease.bailNumber.split('-');
          if (parts.length === 3) {
            nextNumber = parseInt(parts[2], 10) + 1;
          }
        }
        
        lease.bailNumber = `BAIL-${year}-${String(nextNumber).padStart(4, '0')}`;
      }
    },
  },
})

export default Lease
