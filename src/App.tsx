import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Sidebar } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
import { PageContainer } from './components/layout/PageContainer'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { POS } from './pages/POS'
import { Reservations } from './pages/Reservations'
import { Products } from './pages/Products'
import { Customers } from './pages/Customers'
import { Pickup } from './pages/Pickup'
import { Returns } from './pages/Returns'
import { Overdue } from './pages/Overdue'
import { Cashier } from './pages/Cashier'
import { Reports } from './pages/Reports'
import { Settings } from './pages/Settings'

function AppRoutes() {
  const { user, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="text-gray-400">Carregando...</div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[var(--color-bg)]">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <PageContainer>
          <Header onMenuClick={() => setSidebarOpen(true)} />
          <div className="mt-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/nova-locacao" element={<POS />} />
              <Route path="/reservas" element={<Reservations />} />
              <Route path="/produtos" element={<Products />} />
              <Route path="/clientes" element={<Customers />} />
              <Route path="/retiradas" element={<Pickup />} />
              <Route path="/devolucoes" element={<Returns />} />
              <Route path="/atrasos" element={<Overdue />} />
              <Route path="/caixa" element={<Cashier />} />
              <Route path="/relatorios" element={<Reports />} />
              <Route path="/configuracoes" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </PageContainer>
      </div>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
