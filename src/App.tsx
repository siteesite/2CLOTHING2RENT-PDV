import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
import { PageContainer } from './components/layout/PageContainer'
import { Dashboard } from './pages/Dashboard'
import { POS } from './pages/POS'
import { Reservations } from './pages/Reservations'
import { Products } from './pages/Products'
import { Customers } from './pages/Customers'
import { Pickup } from './pages/Pickup'
import { Returns } from './pages/Returns'
import { Overdue } from './pages/Overdue'
import { Cashier, Reports, Settings } from './pages/Placeholder'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[var(--color-bg)]">
        <Sidebar />
        <PageContainer>
          <Header />
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
            </Routes>
          </div>
        </PageContainer>
      </div>
    </BrowserRouter>
  )
}
