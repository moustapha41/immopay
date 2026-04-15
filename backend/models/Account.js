import { DataTypes } from 'sequelize'
import sequelize from '../config/db.js'

const Account = sequelize.define('Account', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  label: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('actif', 'passif', 'charge', 'produit'),
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  balance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  isSystem: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'accounts',
})

// Plan comptable SYSCOHADA révisé — immobilier
Account.SYSCOHADA_DEFAULTS = [
  // Classe 2 — Immobilisations
  { code: '211', label: 'Terrains', type: 'actif', category: 'Immobilisations', isSystem: true },
  { code: '213', label: 'Bâtiments', type: 'actif', category: 'Immobilisations', isSystem: true },
  { code: '231', label: 'Bâtiments en cours', type: 'actif', category: 'Immobilisations', isSystem: true },

  // Classe 4 — Tiers
  { code: '401', label: 'Fournisseurs', type: 'passif', category: 'Tiers', isSystem: true },
  { code: '411', label: 'Locataires — Loyers à recevoir', type: 'actif', category: 'Tiers', isSystem: true },
  { code: '422', label: 'Personnel — Rémunérations dues', type: 'passif', category: 'Tiers', isSystem: true },
  { code: '431', label: 'Sécurité sociale', type: 'passif', category: 'Tiers', isSystem: true },
  { code: '441', label: 'État — Impôts sur les bénéfices', type: 'passif', category: 'Tiers', isSystem: true },
  { code: '443', label: 'État — TVA facturée', type: 'passif', category: 'Tiers', isSystem: true },
  { code: '445', label: 'État — TVA récupérable', type: 'actif', category: 'Tiers', isSystem: true },
  { code: '471', label: 'Débiteurs divers', type: 'actif', category: 'Tiers', isSystem: true },
  { code: '472', label: 'Créditeurs divers', type: 'passif', category: 'Tiers', isSystem: true },
  { code: '486', label: 'Cautions locataires reçues', type: 'passif', category: 'Tiers', isSystem: true },

  // Classe 5 — Trésorerie
  { code: '521', label: 'Banque', type: 'actif', category: 'Trésorerie', isSystem: true },
  { code: '571', label: 'Caisse', type: 'actif', category: 'Trésorerie', isSystem: true },
  { code: '585', label: 'Virements de fonds internes', type: 'actif', category: 'Trésorerie', isSystem: true },

  // Classe 1 — Capitaux
  { code: '101', label: 'Capital social', type: 'passif', category: 'Capitaux', isSystem: true },
  { code: '106', label: 'Réserves', type: 'passif', category: 'Capitaux', isSystem: true },
  { code: '120', label: 'Résultat de l\'exercice (bénéfice)', type: 'passif', category: 'Capitaux', isSystem: true },
  { code: '129', label: 'Résultat de l\'exercice (perte)', type: 'actif', category: 'Capitaux', isSystem: true },
  { code: '162', label: 'Emprunts auprès d\'établissements de crédit', type: 'passif', category: 'Capitaux', isSystem: true },
  { code: '165', label: 'Dépôts et cautionnements reçus', type: 'passif', category: 'Capitaux', isSystem: true },

  // Classe 6 — Charges
  { code: '604', label: 'Achats de matières et fournitures', type: 'charge', category: 'Charges d\'exploitation', isSystem: true },
  { code: '605', label: 'Autres achats', type: 'charge', category: 'Charges d\'exploitation', isSystem: true },
  { code: '613', label: 'Charges de copropriété', type: 'charge', category: 'Charges d\'exploitation', isSystem: true },
  { code: '614', label: 'Charges locatives refacturables', type: 'charge', category: 'Charges d\'exploitation', isSystem: true },
  { code: '615', label: 'Entretien, réparations et maintenance', type: 'charge', category: 'Charges d\'exploitation', isSystem: true },
  { code: '616', label: 'Primes d\'assurance', type: 'charge', category: 'Charges d\'exploitation', isSystem: true },
  { code: '622', label: 'Honoraires (syndic, gestion, comptable)', type: 'charge', category: 'Charges d\'exploitation', isSystem: true },
  { code: '624', label: 'Frais de transport', type: 'charge', category: 'Charges d\'exploitation', isSystem: true },
  { code: '625', label: 'Frais de déplacement', type: 'charge', category: 'Charges d\'exploitation', isSystem: true },
  { code: '626', label: 'Frais postaux et télécommunications', type: 'charge', category: 'Charges d\'exploitation', isSystem: true },
  { code: '627', label: 'Frais bancaires', type: 'charge', category: 'Charges d\'exploitation', isSystem: true },
  { code: '631', label: 'Impôts fonciers', type: 'charge', category: 'Charges d\'exploitation', isSystem: true },
  { code: '632', label: 'Taxes foncières', type: 'charge', category: 'Charges d\'exploitation', isSystem: true },
  { code: '641', label: 'Charges de personnel — Rémunérations', type: 'charge', category: 'Charges de personnel', isSystem: true },
  { code: '646', label: 'Charges sociales', type: 'charge', category: 'Charges de personnel', isSystem: true },
  { code: '661', label: 'Intérêts sur emprunts', type: 'charge', category: 'Charges financières', isSystem: true },
  { code: '681', label: 'Dotations aux amortissements', type: 'charge', category: 'Amortissements', isSystem: true },

  // Classe 7 — Produits
  { code: '706', label: 'Revenus locatifs (loyers)', type: 'produit', category: 'Produits d\'exploitation', isSystem: true },
  { code: '707', label: 'Revenus charges récupérables', type: 'produit', category: 'Produits d\'exploitation', isSystem: true },
  { code: '708', label: 'Produits annexes (parking, cave...)', type: 'produit', category: 'Produits d\'exploitation', isSystem: true },
  { code: '752', label: 'Plus-values sur cessions immobilières', type: 'produit', category: 'Produits exceptionnels', isSystem: true },
  { code: '771', label: 'Intérêts bancaires reçus', type: 'produit', category: 'Produits financiers', isSystem: true },
  { code: '758', label: 'Produits divers de gestion', type: 'produit', category: 'Produits d\'exploitation', isSystem: true },
]

export default Account
