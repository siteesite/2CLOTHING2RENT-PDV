import { useEffect, useState } from 'react'
import { getRentals } from '../services/supabase'
import type { Rental, Customer, Product } from '../types'

type RentalWithRelations = Rental & { customers: Customer; products: Product }

export function Reservations() {
  const [rentals, setRentals] = useState<RentalWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    loadRentals()
  }, [])

  async function loadRentals() {
    try {
      const data = await getRentals()
      setRentals(data as RentalWithRelations[])
    } catch (error) {
      console.error('Erro ao carregar reservas:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtered = statusFilter
    ? rentals.filter((r) => r.status === statusFilter)
    : rentals

  const statusColors: Record<string, string> = {
    pending_payment: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    preparing: 'bg-purple-100 text-purple-700',
    ready_for_pickup: 'bg-indigo-100 text-indigo-700',
    active: 'bg-green-100 text-green-700',
    returned: 'bg-gray-100 text-gray-700',
    inspection: 'bg-orange-100 text-orange-700',
    cleaning: 'bg-cyan-100 text-cyan-700',
    maintenance: 'bg-red-100 text-red-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-gray-100 text-gray-500',
  }

  const statusLabels: Record<string, string> = {
    pending_payment: 'Pgto Pendente',
    confirmed: 'Confirmada',
    preparing: 'Em Preparação',
    ready_for_pickup: 'Pronta p/ Retirada',
    active: 'Ativa',
    returned: 'Devolvida',
    inspection: 'Inspeção',
    cleaning: 'Higienização',
    maintenance: 'Manutenção',
    completed: 'Concluída',
    cancelled: 'Cancelada',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Carregando reservas...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
        >
          <option value="">Todos os status</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="text-sm text-gray-500">
        {filtered.length} reserva{filtered.length !== 1 ? 's' : ''}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Produto</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Período</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((rental) => (
                <tr key={rental.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-[var(--color-primary)]">
                    {rental.customers?.first_name} {rental.customers?.last_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {rental.products?.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {rental.start_date} → {rental.end_date}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-[var(--color-primary)]">
                    {rental.total_price
                      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rental.total_price)
                      : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[rental.status] || 'bg-gray-100 text-gray-700'}`}>
                      {statusLabels[rental.status] || rental.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          Nenhuma reserva encontrada.
        </div>
      )}
    </div>
  )
}
