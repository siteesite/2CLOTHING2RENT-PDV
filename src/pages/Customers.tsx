import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function Customers() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null)

  useEffect(() => {
    loadCustomers()
  }, [])

  async function loadCustomers() {
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('email, customer_phone, customer_cpf, billing_address, shipping_address, total_price, financial_status, order_name, created_at, line_items')
        .order('created_at', { ascending: false })

      if (error) throw error

      const map = new Map<string, any>()

      for (const order of orders || []) {
        if (!order.email) continue

        if (!map.has(order.email)) {
          const addr = order.shipping_address || order.billing_address || {}
          map.set(order.email, {
            email: order.email,
            name: addr.name || '',
            cpf: order.customer_cpf || '',
            phone: order.customer_phone || '',
            address: {
              street: addr.street || '',
              number: addr.number || '',
              neighborhood: addr.neighborhood || '',
              city: addr.city || '',
              state: addr.state || addr.province || '',
              zip: addr.zip || '',
            },
            orders: [order],
            total_spent: order.total_price || 0,
          })
        } else {
          const c = map.get(order.email)!
          c.orders.push(order)
          c.total_spent += order.total_price || 0
          if (!c.cpf && order.customer_cpf) c.cpf = order.customer_cpf
          if (!c.phone && order.customer_phone) c.phone = order.customer_phone
          if (!c.name) {
            const addr = order.shipping_address || order.billing_address || {}
            c.name = addr.name || ''
            c.address = {
              street: addr.street || '',
              number: addr.number || '',
              neighborhood: addr.neighborhood || '',
              city: addr.city || '',
              state: addr.state || addr.province || '',
              zip: addr.zip || '',
            }
          }
        }
      }

      setCustomers(Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)))
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtered = customers.filter((c) => {
    if (!search) return true
    const term = search.toLowerCase()
    return (
      c.name?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.phone?.includes(search) ||
      c.cpf?.includes(search) ||
      c.address?.city?.toLowerCase().includes(term)
    )
  })

  const paymentLabels: Record<string, string> = {
    paid: 'Pago',
    pending: 'Pendente',
    refunded: 'Estornado',
    voided: 'Cancelado',
  }

  const paymentColors: Record<string, string> = {
    paid: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    refunded: 'bg-gray-100 text-gray-700',
    voided: 'bg-red-100 text-red-700',
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-400">Carregando clientes...</div></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Buscar por nome, e-mail, telefone, CPF ou cidade..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
        />
        <div className="px-4 py-2.5 bg-gray-50 rounded-lg text-sm text-gray-500">
          {filtered.length} cliente{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">E-mail</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Telefone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">CPF</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Endereço</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cidade/UF</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Pedidos</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => {
                const addr = customer.address
                const fullAddr = [addr.street, addr.number].filter(Boolean).join(', ')
                const cityUf = [addr.city, addr.state].filter(Boolean).join('/')

                return (
                  <tr key={customer.email} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-xs font-medium">
                          {customer.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="text-sm font-medium text-[var(--color-primary)]">
                          {customer.name || 'Sem nome'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{customer.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{customer.phone || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{customer.cpf || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate" title={fullAddr}>{fullAddr || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{cityUf || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{customer.orders.length}</td>
                    <td className="px-4 py-3 text-sm font-medium text-[var(--color-primary)]">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(customer.total_spent)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedCustomer(customer)}
                        className="p-2 rounded-lg hover:bg-blue-50 text-blue-400 hover:text-blue-600"
                        title="Ver detalhes"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">Nenhum cliente encontrado.</div>
      )}

      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-[var(--color-primary)]">Detalhes do Cliente</h3>
                <button onClick={() => setSelectedCustomer(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-2xl font-medium">
                  {selectedCustomer.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-[var(--color-primary)]">{selectedCustomer.name || 'Sem nome'}</h4>
                  <p className="text-sm text-gray-500">{selectedCustomer.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-sm font-semibold text-[var(--color-primary)] mb-3">Dados Pessoais</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-xs text-gray-500">E-mail</span>
                      <span className="text-xs font-medium text-[var(--color-primary)]">{selectedCustomer.email}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-xs text-gray-500">Telefone</span>
                      <span className="text-xs font-medium text-[var(--color-primary)]">{selectedCustomer.phone || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-xs text-gray-500">CPF</span>
                      <span className="text-xs font-medium text-[var(--color-primary)]">{selectedCustomer.cpf || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-xs text-gray-500">Total Pedidos</span>
                      <span className="text-xs font-medium text-[var(--color-primary)]">{selectedCustomer.orders.length}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-xs text-gray-500">Total Gasto</span>
                      <span className="text-xs font-bold text-[var(--color-success)]">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedCustomer.total_spent)}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-[var(--color-primary)] mb-3">Endereço</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-xs text-gray-500">Rua</span>
                      <span className="text-xs font-medium text-[var(--color-primary)] text-right max-w-[60%]">{selectedCustomer.address.street || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-xs text-gray-500">Número</span>
                      <span className="text-xs font-medium text-[var(--color-primary)]">{selectedCustomer.address.number || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-xs text-gray-500">Bairro</span>
                      <span className="text-xs font-medium text-[var(--color-primary)]">{selectedCustomer.address.neighborhood || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-xs text-gray-500">Cidade</span>
                      <span className="text-xs font-medium text-[var(--color-primary)]">{selectedCustomer.address.city || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-xs text-gray-500">Estado</span>
                      <span className="text-xs font-medium text-[var(--color-primary)]">{selectedCustomer.address.state || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-xs text-gray-500">CEP</span>
                      <span className="text-xs font-medium text-[var(--color-primary)]">{selectedCustomer.address.zip || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-[var(--color-primary)] mb-3">Histórico de Pedidos</h4>
                <div className="space-y-2">
                  {selectedCustomer.orders.map((order: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-primary)]">{order.order_name}</p>
                        <p className="text-xs text-gray-500">
                          {order.line_items?.map((item: any) => item.name).join(', ')}
                        </p>
                        <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${paymentColors[order.financial_status] || 'bg-gray-100'}`}>
                          {paymentLabels[order.financial_status] || order.financial_status}
                        </span>
                        <p className="text-sm font-bold text-[var(--color-primary)] mt-1">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_price)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setSelectedCustomer(null)}
                className="w-full mt-6 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
