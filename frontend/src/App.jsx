import { Routes, Route, Navigate } from 'react-router-dom'
import { isAuthenticated } from './api'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Properties from './pages/Properties'
import CRM from './pages/CRM'
import Tenants from './pages/Tenants'
import Charges from './pages/Charges'
import Payments from './pages/Payments'
import SettingsPage from './pages/Settings'
import PortailLocataire from './pages/PortailLocataire'

function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return children
}

function App() {
  return (
    <Routes>
      {/* Route Publique: Login */}
      <Route path="/login" element={<Login />} />

      {/* Route Publique: Portail Locataire */}
      <Route path="/locataire/:token" element={<PortailLocataire />} />
      
      {/* Routes Administrateur (protégées) */}
      <Route element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/" element={<Dashboard />} />
        <Route path="/biens" element={<Properties />} />
        <Route path="/locataires" element={<Tenants />} />
        <Route path="/crm" element={<CRM />} />
        <Route path="/charges" element={<Charges />} />
        <Route path="/paiements" element={<Payments />} />
        <Route path="/parametres" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}

export default App
