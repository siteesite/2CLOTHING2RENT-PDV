import { useLocation } from 'react-router-dom'

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
  const title = pageTitles[location.pathname] || 'PDV'

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-40">
      <h2 className="text-lg font-semibold text-[var(--color-primary)]">{title}</h2>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">Admin</span>
        <div className="w-8 h-8 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center text-sm font-medium">
          A
        </div>
      </div>
    </header>
  )
}
