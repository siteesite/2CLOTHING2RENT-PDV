import { useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/nova-locacao': 'Nova Locação',
  '/reservas': 'Reservas',
  '/produtos': 'Produtos',
  '/clientes': 'Clientes',
  '/retiradas': 'Retiradas',
  '/devolucoes': 'Devoluções',
  '/atrasos': 'Atrasos',
  '/caixa': 'Caixa',
  '/relatorios': 'Relatórios',
  '/configuracoes': 'Configurações',
}

export function Header() {
  const location = useLocation()
  const { user, signOut } = useAuth()
  const title = pageTitles[location.pathname] || 'PDV'

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-40">
      <h2 className="text-lg font-semibold text-[var(--color-primary)]">{title}</h2>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">{user?.email}</span>
        <div className="w-8 h-8 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center text-sm font-medium">
          {user?.email?.[0]?.toUpperCase() || 'A'}
        </div>
        <button
          onClick={signOut}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          title="Sair"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
        </button>
      </div>
    </header>
  )
}
