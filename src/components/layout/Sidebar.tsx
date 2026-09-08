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

export function Sidebar() {
  return (
    <aside className="w-64 h-screen bg-[var(--color-sidebar)] text-white flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6 border-b border-white/10">
        <h1 className="text-xl font-bold tracking-tight">CLOTHING2RENT</h1>
        <p className="text-xs text-white/50 mt-1">PDV — Painel</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
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
  )
}
