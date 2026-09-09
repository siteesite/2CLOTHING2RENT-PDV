import { NavLink } from 'react-router-dom'

const menuItems = [
  { path: '/', label: 'Dashboard', icon: '🏠' },
  { path: '/nova-locacao', label: 'Nova Locação', icon: '🛍' },
  { path: '/reservas', label: 'Reservas', icon: '📅' },
  { path: '/produtos', label: 'Produtos', icon: '👗' },
  { path: '/clientes', label: 'Clientes', icon: '👤' },
  { path: '/retiradas', label: 'Retiradas', icon: '📦' },
  { path: '/devolucoes', label: 'Devoluções', icon: '↩' },
  { path: '/atrasos', label: 'Atrasos', icon: '⚠' },
  { path: '/caixa', label: 'Caixa', icon: '💰' },
  { path: '/relatorios', label: 'Relatórios', icon: '📊' },
  { path: '/configuracoes', label: 'Configurações', icon: '⚙' },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-[var(--color-sidebar)] text-white flex flex-col z-50 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">CLOTHING2RENT</h1>
            <p className="text-xs text-white/50 mt-1">PDV — Painel</p>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-white/70"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                  isActive
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 text-xs text-white/40">
          v1.0.0
        </div>
      </aside>
    </>
  )
}

export function HamburgerButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  )
}
