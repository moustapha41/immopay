import dotenv from 'dotenv'
dotenv.config()

import { sequelize, User, Property, Tenant, Prospect, Payment, Charge, Settings } from './models/index.js'

async function seed() {
  try {
    await sequelize.authenticate()
    console.log('✅ PostgreSQL connecté.')

    // Force recreate all tables
    await sequelize.sync({ force: true })
    console.log('✅ Tables recréées.')

    // --- Admin User ---
    const admin = await User.create({
      firstName: 'Abdoulaye',
      lastName: 'Diop',
      email: 'admin@immosuite.sn',
      phone: '+221 77 123 45 67',
      password: 'admin123',
      role: 'admin',
    })
    console.log('👤 Admin créé: admin@immosuite.sn / admin123')

    // --- Properties ---
    const props = await Property.bulkCreate([
      { title: 'Appartement Standing Almadies', address: 'Rue AL-32, Almadies, Dakar', city: 'Dakar', type: 'Appartement', status: 'Loué', price: 450000, surface: 95, rooms: 4, bedrooms: 2, tenantName: 'Aminata Diallo' },
      { title: 'Studio Meublé Plateau', address: 'Avenue Léopold Sédar Senghor, Plateau, Dakar', city: 'Dakar', type: 'Studio', status: 'Disponible', price: 180000, surface: 28, rooms: 1, bedrooms: 1, tenantName: null },
      { title: 'Villa avec Jardin', address: '45 Quartier Résidentiel, Saly, Mbour', city: 'Mbour', type: 'Villa', status: 'Loué', price: 650000, surface: 180, rooms: 6, bedrooms: 4, tenantName: 'Famille Ndiaye' },
      { title: 'F3 Rénové Vue Mer', address: 'Corniche Ouest, Fann, Dakar', city: 'Dakar', type: 'Appartement', status: 'Loué', price: 380000, surface: 72, rooms: 3, bedrooms: 2, tenantName: 'Moussa Sow' },
      { title: 'Duplex Moderne Ngor', address: 'Cité Ngor, Dakar', city: 'Dakar', type: 'Duplex', status: 'En travaux', price: 750000, surface: 140, rooms: 5, bedrooms: 3, tenantName: null },
      { title: 'Appartement Centre-Ville', address: 'Avenue Blaise Diagne, Saint-Louis', city: 'Saint-Louis', type: 'Appartement', status: 'Loué', price: 250000, surface: 65, rooms: 3, bedrooms: 2, tenantName: 'Fatou Sarr' },
    ])
    console.log(`🏠 ${props.length} biens créés.`)

    // --- Tenants ---
    const tenantData = [
      { firstName: 'Aminata', lastName: 'Diallo', phone: '77 123 45 67', email: 'aminata.diallo@gmail.com', idType: 'CNI', idNumber: 'SN-2019-04523', propertyId: props[0].id, propertyName: props[0].title, bailNumber: 'BAIL-2025-001', dateEntree: '2025-03-01', dateFinBail: '2027-02-28', depositAmount: 900000, depositStatus: 'Encaissé', rent: 450000, documents: ['Contrat de bail', 'État des lieux', 'CNI', 'Attestation employeur'], status: 'Actif', token: 'AMDI01' },
      { firstName: 'Ibrahima', lastName: 'Ndiaye', phone: '78 234 56 78', email: 'ibrahima.ndiaye@orange.sn', idType: 'Passeport', idNumber: 'A00456789', propertyId: props[2].id, propertyName: props[2].title, bailNumber: 'BAIL-2025-002', dateEntree: '2025-01-15', dateFinBail: '2027-01-14', depositAmount: 1300000, depositStatus: 'Encaissé', rent: 650000, documents: ['Contrat de bail', 'État des lieux', 'Passeport'], status: 'Actif', token: 'IBND02' },
      { firstName: 'Moussa', lastName: 'Sow', phone: '76 345 67 89', email: 'moussa.sow@gmail.com', idType: 'CNI', idNumber: 'SN-2020-07891', propertyId: props[3].id, propertyName: props[3].title, bailNumber: 'BAIL-2024-008', dateEntree: '2024-06-01', dateFinBail: '2026-05-31', depositAmount: 760000, depositStatus: 'Encaissé', rent: 380000, documents: ['Contrat de bail', 'État des lieux', 'CNI', 'Bulletins de salaire'], status: 'Actif', token: 'MOSW03' },
      { firstName: 'Fatou', lastName: 'Sarr', phone: '70 456 78 90', email: 'fatou.sarr@free.sn', idType: 'CNI', idNumber: 'SN-2021-11234', propertyId: props[5].id, propertyName: props[5].title, bailNumber: 'BAIL-2025-005', dateEntree: '2025-02-01', dateFinBail: '2027-01-31', depositAmount: 500000, depositStatus: 'Encaissé', rent: 250000, documents: ['Contrat de bail', 'CNI'], status: 'Actif', token: 'FASA04' },
    ]
    const tenants = await Tenant.bulkCreate(tenantData)
    console.log(`👥 ${tenants.length} locataires créés.`)

    // --- Prospects ---
    const prospectData = [
      { name: 'Ousmane Fall', email: 'ousmane.f@gmail.com', phone: '77 567 89 01', status: 'Nouveau', source: 'Site web', score: 85, interest: 'Studio Plateau', date: '2026-04-05' },
      { name: 'Aïssatou Ba', email: 'aissatou.b@orange.sn', phone: '78 678 90 12', status: 'Contact', source: 'Expat-Dakar', score: 72, interest: 'Duplex Ngor', date: '2026-04-04' },
      { name: 'Cheikh Mbaye', email: 'cheikh.m@gmail.com', phone: '76 789 01 23', status: 'Visite', source: 'Recommandation', score: 90, interest: 'Appart. Almadies', date: '2026-04-03' },
      { name: 'Mariama Diop', email: 'mariama.d@free.sn', phone: '70 890 12 34', status: 'Offre', source: 'Jumia House', score: 95, interest: 'Studio Plateau', date: '2026-04-02' },
      { name: 'Abdoulaye Gueye', email: 'abdoulaye.g@gmail.com', phone: '77 901 23 45', status: 'Signé', source: 'Site web', score: 100, interest: 'Villa Saly', date: '2026-04-01' },
      { name: 'Ndèye Fatou Seck', email: 'ndeye.s@orange.sn', phone: '78 012 34 56', status: 'Nouveau', source: 'Expat-Dakar', score: 60, interest: 'F3 Fann', date: '2026-04-05' },
      { name: 'Papa Amadou Sy', email: 'papa.sy@gmail.com', phone: '76 123 45 67', status: 'Contact', source: 'Recommandation', score: 78, interest: 'Appart. Saint-Louis', date: '2026-04-04' },
      { name: 'Khady Touré', email: 'khady.t@free.sn', phone: '70 234 56 78', status: 'Visite', source: 'Site web', score: 88, interest: 'Duplex Ngor', date: '2026-04-03' },
    ]
    const prospects = await Prospect.bulkCreate(prospectData)
    console.log(`📋 ${prospects.length} prospects créés.`)

    // --- Payments ---
    const paymentData = [
      { tenantId: tenants[0].id, tenantName: 'Aminata Diallo', propertyId: props[0].id, propertyName: 'Appart. Almadies', amount: 450000, status: 'Payé', date: '2026-04-01', method: 'Virement', quittance: true, period: '2026-04' },
      { tenantId: tenants[1].id, tenantName: 'Famille Ndiaye', propertyId: props[2].id, propertyName: 'Villa Saly', amount: 650000, status: 'Payé', date: '2026-04-02', method: 'Orange Money', quittance: true, period: '2026-04' },
      { tenantId: tenants[2].id, tenantName: 'Moussa Sow', propertyId: props[3].id, propertyName: 'F3 Vue Mer', amount: 380000, status: 'En retard', date: '2026-04-01', method: '-', quittance: false, period: '2026-04' },
      { tenantId: tenants[3].id, tenantName: 'Fatou Sarr', propertyId: props[5].id, propertyName: 'Appart. Saint-Louis', amount: 250000, status: 'Payé', date: '2026-04-03', method: 'Wave', quittance: true, period: '2026-04' },
      { tenantId: tenants[0].id, tenantName: 'Aminata Diallo', propertyId: props[0].id, propertyName: 'Appart. Almadies', amount: 450000, status: 'Payé', date: '2026-03-01', method: 'Virement', quittance: true, period: '2026-03' },
      { tenantId: tenants[1].id, tenantName: 'Famille Ndiaye', propertyId: props[2].id, propertyName: 'Villa Saly', amount: 650000, status: 'Payé', date: '2026-03-03', method: 'Orange Money', quittance: true, period: '2026-03' },
      { tenantId: tenants[2].id, tenantName: 'Moussa Sow', propertyId: props[3].id, propertyName: 'F3 Vue Mer', amount: 380000, status: 'Payé', date: '2026-03-05', method: 'Virement', quittance: true, period: '2026-03' },
      { tenantId: tenants[3].id, tenantName: 'Fatou Sarr', propertyId: props[5].id, propertyName: 'Appart. Saint-Louis', amount: 250000, status: 'Payé', date: '2026-03-02', method: 'Wave', quittance: true, period: '2026-03' },
      { tenantId: tenants[0].id, tenantName: 'Aminata Diallo', propertyId: props[0].id, propertyName: 'Appart. Almadies', amount: 450000, status: 'Payé', date: '2026-02-01', method: 'Virement', quittance: true, period: '2026-02' },
      { tenantId: tenants[1].id, tenantName: 'Famille Ndiaye', propertyId: props[2].id, propertyName: 'Villa Saly', amount: 650000, status: 'Payé', date: '2026-02-02', method: 'Orange Money', quittance: true, period: '2026-02' },
    ]
    const payments = await Payment.bulkCreate(paymentData)
    console.log(`💰 ${payments.length} paiements créés.`)

    // --- Charges ---
    const chargesData = [
      // Tenant charges
      { category: 'tenant', label: 'Eau (parties communes)', type: 'Eau', period: 'Avril 2026', propertyId: props[0].id, propertyName: 'Appart. Almadies', tenantId: tenants[0].id, tenantName: 'Aminata Diallo', provision: 15000, reel: 12500, status: 'Régularisé' },
      { category: 'tenant', label: 'Électricité (parties communes)', type: 'Électricité', period: 'Avril 2026', propertyId: props[0].id, propertyName: 'Appart. Almadies', tenantId: tenants[0].id, tenantName: 'Aminata Diallo', provision: 20000, reel: 22000, status: 'À régulariser' },
      { category: 'tenant', label: 'Ordures ménagères', type: 'Ordures', period: 'Avril 2026', propertyId: props[0].id, propertyName: 'Appart. Almadies', tenantId: tenants[0].id, tenantName: 'Aminata Diallo', provision: 5000, reel: 5000, status: 'Régularisé' },
      { category: 'tenant', label: 'Eau (parties communes)', type: 'Eau', period: 'Avril 2026', propertyId: props[2].id, propertyName: 'Villa Saly', tenantId: tenants[1].id, tenantName: 'Famille Ndiaye', provision: 25000, reel: 28000, status: 'À régulariser' },
      { category: 'tenant', label: 'Gardiennage', type: 'Gardiennage', period: 'Avril 2026', propertyId: props[2].id, propertyName: 'Villa Saly', tenantId: tenants[1].id, tenantName: 'Famille Ndiaye', provision: 30000, reel: 30000, status: 'Régularisé' },
      { category: 'tenant', label: 'Ordures ménagères', type: 'Ordures', period: 'Avril 2026', propertyId: props[3].id, propertyName: 'F3 Vue Mer', tenantId: tenants[2].id, tenantName: 'Moussa Sow', provision: 5000, reel: 5000, status: 'Régularisé' },
      { category: 'tenant', label: 'Électricité (parties communes)', type: 'Électricité', period: 'Avril 2026', propertyId: props[5].id, propertyName: 'Appart. Saint-Louis', tenantId: tenants[3].id, tenantName: 'Fatou Sarr', provision: 10000, reel: 9000, status: 'Régularisé' },
      // Owner charges
      { category: 'owner', label: 'Peinture façade immeuble', type: 'Travaux', propertyId: props[0].id, propertyName: 'Appart. Almadies', amount: 850000, date: '2026-03-15', status: 'Payé' },
      { category: 'owner', label: 'Assurance PNO', type: 'Assurance', propertyId: null, propertyName: 'Tous les biens', amount: 320000, date: '2026-01-10', status: 'Payé' },
      { category: 'owner', label: 'Taxe foncière 2026', type: 'Taxe', propertyId: null, propertyName: 'Tous les biens', amount: 480000, date: '2026-04-01', status: 'En attente' },
      { category: 'owner', label: 'Réparation plomberie', type: 'Entretien', propertyId: props[3].id, propertyName: 'F3 Vue Mer', amount: 75000, date: '2026-04-03', status: 'Payé' },
      { category: 'owner', label: 'Frais agence immobilière', type: 'Agence', propertyId: props[5].id, propertyName: 'Appart. Saint-Louis', amount: 250000, date: '2026-02-01', status: 'Payé' },
      { category: 'owner', label: 'Entretien jardin trimestriel', type: 'Entretien', propertyId: props[2].id, propertyName: 'Villa Saly', amount: 120000, date: '2026-04-05', status: 'Payé' },
      { category: 'owner', label: 'Remplacement climatiseur', type: 'Travaux', propertyId: props[0].id, propertyName: 'Appart. Almadies', amount: 450000, date: '2026-03-20', status: 'Payé' },
    ]
    const charges = await Charge.bulkCreate(chargesData)
    console.log(`📊 ${charges.length} charges créées.`)

    // --- Settings ---
    await Settings.create({
      agencyName: 'ImmoSuite Sénégal',
      ninea: '001234567 2G3',
      address: 'Corniche Ouest, Mermoz, Dakar',
      city: 'Dakar',
      website: 'https://immosuite.sn',
      currency: 'XOF',
      language: 'FR',
      dateFormat: 'DD/MM/YYYY',
    })
    console.log('⚙️  Paramètres créés.')

    console.log('\n🎉 Seed terminé avec succès !')
    console.log('   → Connexion admin: admin@immosuite.sn / admin123')
    console.log('   → Tokens portail locataire: AMDI01, IBND02, MOSW03, FASA04')

    process.exit(0)
  } catch (err) {
    console.error('❌ Erreur seed:', err.message)
    console.error(err)
    process.exit(1)
  }
}

seed()
