import { useEffect, useState } from 'react'
import { getRentals, getTransactions, getDeposits, getProducts, getCustomers } from '../services/supabase'
import type { Rental, Customer, Product, RentalTransaction, RentalDeposit } from '../types'

type RentalWithRelations = Rental & { customers: Customer; products: Product }

export function Reports() {
  const [rentals, setRentals] = useState<RentalWithRelations[]>([])
  const [transactions, setTransactions] = useState<RentalTransaction[]>([])
  const [deposits, setDeposits] = useState<RentalDeposit[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'financial' | 'products' | 'customers' | 'operations'>('financial')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [rentalsData, transactionsData, depositsData, productsData, customersData] = await Promise.all([
        getRentals(),
        getTransactions(),
        getDeposits(),
        getProducts(),
        getCustomers(),
      ])
      setRentals(rentalsData as RentalWithRelations[])
      setTransactions(transactionsData)
      setDeposits(depositsData)
      setProducts(productsData)
      setCustomers(customersData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalRevenue = transactions
    .filter((t) => t.transaction_type === 'payment' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0)

  const pendingPayments = rentals
    .filter((r) => r.status !== 'cancelled' && r.status !== 'completed')
    .reduce((sum, r) => {
      const paid = transactions
        .filter((t) => t.rental_id === r.id && t.transaction_type === 'payment' && t.status === 'completed')
        .reduce((s, t) => s + t.amount, 0)
      return sum + ((r.total_price || 0) - paid)
    }, 0)

  const totalDepositsHeld = deposits
    .filter((d) => d.status === 'held')
    .reduce((sum, d) => sum + d.amount, 0)

  const totalDamageCharges = transactions
    .filter((t) => t.transaction_type === 'damage_charge' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalLateFees = transactions
    .filter((t) => t.transaction_type === 'late_fee' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0)

  const productRentalCount: Record<string, number> = {}
  rentals.forEach((r) => {
    if (r.product_id) {
      productRentalCount[r.product_id] = (productRentalCount[r.product_id] || 0) + 1
    }
  })

  const topProducts = Object.entries(productRentalCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([productId, count]) => {
      const product = products.find((p) => p.id === productId)
      return { product, count }
    })

  const customerRentalCount: Record<string, number> = {}
  const customerTotalSpent: Record<string, number> = {}
  rentals.forEach((r) => {
    if (r.user_id) {
      customerRentalCount[r.user_id] = (customerRentalCount[r.user_id] || 0) + 1
      customerTotalSpent[r.user_id] = (customerTotalSpent[r.user_id] || 0) + (r.total_price || 0)
    }
  })

  const topCustomers = Object.entries(customerRentalCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([customerId, count]) => {
      const customer = customers.find((c) => c.id === customerId)
      return { customer, count, totalSpent: customerTotalSpent[customerId] || 0 }
    })

  const activeRentals = rentals.filter((r) => r.status === 'active').length
  const cleaningRentals = rentals.filter((r) => r.status === 'cleaning').length
  const maintenanceRentals = rentals.filter((r) => r.status === 'maintenance').length
  const overdueRentals = rentals.filter((r) => {
    const today = new Date().toISOString().split('T')[0]
    return r.status === 'active' && r.end_date < today
  }).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Carregando relatórios...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {[
          { key: 'financial', label: 'Financeiro', icon: '💰' },
          { key: 'products', label: 'Produtos', icon: '👗' },
          { key: 'customers', label: 'Clientes', icon: '👤' },
          { key: 'operations', label: 'Operação', icon: '📦' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'financial' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Receita Total</h3>
              <p className="text-2xl font-bold text-[var(--color-success)]">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Pendentes</h3>
              <p className="text-2xl font-bold text-[var(--color-warning)]">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pendingPayments)}
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Cauções Retidas</h3>
              <p className="text-2xl font-bold text-[var(--color-info)]">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDepositsHeld)}
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Multas + Danos</h3>
              <p className="text-2xl font-bold text-[var(--color-danger)]">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalLateFees + totalDamageCharges)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-[var(--color-primary)]">Últimas Transações</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Data</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Método</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 20).map((t) => (
                    <tr key={t.id} className="border-b border-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(t.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          t.transaction_type === 'payment' ? 'bg-green-100 text-green-700' :
                          t.transaction_type === 'deposit' ? 'bg-blue-100 text-blue-700' :
                          t.transaction_type === 'refund' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {t.transaction_type === 'payment' ? 'Pagamento' :
                           t.transaction_type === 'deposit' ? 'Caução' :
                           t.transaction_type === 'refund' ? 'Estorno' :
                           t.transaction_type === 'damage_charge' ? 'Dano' : 'Multa'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{t.payment_method}</td>
                      <td className="px-6 py-4 text-sm font-medium text-[var(--color-primary)]">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-[var(--color-primary)]">Produtos Mais Alugados</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Produto</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Marca</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Locações</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Preço</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map(({ product, count }, index) => (
                    <tr key={product?.id} className="border-b border-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                      <td className="px-6 py-4 text-sm font-medium text-[var(--color-primary)]">{product?.name || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{product?.brand || '—'}</td>
                      <td className="px-6 py-4 text-sm font-medium text-[var(--color-primary)]">{count}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {product?.price ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-[var(--color-primary)]">Clientes Recorrentes</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">E-mail</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Locações</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Total Gasto</th>
                  </tr>
                </thead>
                <tbody>
                  {topCustomers.map(({ customer, count, totalSpent }, index) => (
                    <tr key={customer?.id} className="border-b border-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                      <td className="px-6 py-4 text-sm font-medium text-[var(--color-primary)]">
                        {customer?.first_name} {customer?.last_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{customer?.email || '—'}</td>
                      <td className="px-6 py-4 text-sm font-medium text-[var(--color-primary)]">{count}</td>
                      <td className="px-6 py-4 text-sm font-medium text-[var(--color-success)]">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSpent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'operations' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Locações Ativas</h3>
              <p className="text-3xl font-bold text-[var(--color-success)]">{activeRentals}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Em Higienização</h3>
              <p className="text-3xl font-bold text-[var(--color-warning)]">{cleaningRentals}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Em Manutenção</h3>
              <p className="text-3xl font-bold text-[var(--color-danger)]">{maintenanceRentals}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Em Atraso</h3>
              <p className="text-3xl font-bold text-[var(--color-danger)]">{overdueRentals}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-[var(--color-primary)] mb-4">Resumo Operacional</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Total de Produtos Cadastrados</span>
                <span className="font-medium text-[var(--color-primary)]">{products.length}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Total de Clientes Cadastrados</span>
                <span className="font-medium text-[var(--color-primary)]">{customers.length}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Total de Locações</span>
                <span className="font-medium text-[var(--color-primary)]">{rentals.length}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Locações Concluídas</span>
                <span className="font-medium text-[var(--color-success)]">
                  {rentals.filter((r) => r.status === 'completed').length}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Locações Canceladas</span>
                <span className="font-medium text-[var(--color-danger)]">
                  {rentals.filter((r) => r.status === 'cancelled').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
