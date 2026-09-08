import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Rental, Product } from '../types'

interface EnrichedRental extends Rental {
  product?: Product
}

export function Reservations() {
  const [rentals, setRentals] = useState<EnrichedRental[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedRental, setSelectedRental] = useState<EnrichedRental | null>(null)

  useEffect(() => {
    loadRentals()
  }, [])

  async function loadRentals() {
    try {
      const { data: rentalsData, error } = await supabase
        .from('rentals')
        .select('*')
        .order('start_date', { ascending: false })

      if (error) throw error

      const productIds = [...new Set((rentalsData || []).map((r) => r.product_id).filter(Boolean))]

      let productsMap: Record<string, Product> = {}
      if (productIds.length > 0) {
        const { data: productsData } = await supabase
          .from('products')
          .select('id, name, brand, category, image_url, size, color, price')
          .in('id', productIds)

        if (productsData) {
          productsMap = Object.fromEntries(productsData.map((p) => [p.id, p]))
        }
      }

      const enriched: EnrichedRental[] = (rentalsData || []).map((r) => ({
        ...r,
        product: productsMap[r.product_id],
      }))

      setRentals(enriched)
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
    pending: 'bg-yellow-100 text-yellow-700',
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
    pending: 'Pendente',
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
        <span className="text-sm text-gray-500 self-center">
          {filtered.length} reserva{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-3">
        {filtered.map((rental) => (
          <div
            key={rental.id}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-gray-200 transition-colors"
          >
            <div className="flex items-center gap-4">
              {rental.product?.image_url ? (
                <img
                  src={rental.product.image_url}
                  alt={rental.product.name}
                  className="w-14 h-18 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-18 rounded-lg bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">
                  👗
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-sm text-[var(--color-primary)] truncate">
                    {rental.product?.name || 'Produto'}
                  </h3>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${statusColors[rental.status] || 'bg-gray-100 text-gray-700'}`}>
                    {statusLabels[rental.status] || rental.status}
                  </span>
                </div>

                {rental.product?.brand && (
                  <p className="text-xs text-gray-500 mt-0.5">{rental.product.brand}</p>
                )}

                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>📅 {rental.start_date} → {rental.end_date}</span>
                  {rental.total_price && (
                    <span className="font-medium text-[var(--color-primary)]">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rental.total_price)}
                    </span>
                  )}
                  {rental.order_name && (
                    <span className="text-gray-400">#{rental.order_name}</span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedRental(rental)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[var(--color-primary)] transition-colors flex-shrink-0"
                title="Ver detalhes"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          Nenhuma reserva encontrada.
        </div>
      )}

      {selectedRental && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-[var(--color-primary)]">Detalhes da Reserva</h3>
                <button
                  onClick={() => setSelectedRental(null)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex items-start gap-4 mb-6">
                {selectedRental.product?.image_url ? (
                  <img
                    src={selectedRental.product.image_url}
                    alt={selectedRental.product.name}
                    className="w-24 h-32 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-24 h-32 rounded-lg bg-gray-100 flex items-center justify-center text-3xl">👗</div>
                )}
                <div>
                  <h4 className="font-semibold text-[var(--color-primary)]">{selectedRental.product?.name}</h4>
                  {selectedRental.product?.brand && (
                    <p className="text-sm text-gray-500">{selectedRental.product.brand}</p>
                  )}
                  {selectedRental.product?.category && (
                    <p className="text-xs text-gray-400 mt-1">{selectedRental.product.category}</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Status</span>
                  <span className={`text-sm font-medium px-2.5 py-0.5 rounded-full ${statusColors[selectedRental.status]}`}>
                    {statusLabels[selectedRental.status]}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Data Início</span>
                  <span className="text-sm font-medium text-[var(--color-primary)]">{selectedRental.start_date}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Data Fim</span>
                  <span className="text-sm font-medium text-[var(--color-primary)]">{selectedRental.end_date}</span>
                </div>
                {selectedRental.total_price && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">Valor</span>
                    <span className="text-sm font-bold text-[var(--color-primary)]">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedRental.total_price)}
                    </span>
                  </div>
                )}
                {selectedRental.order_name && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">Pedido</span>
                    <span className="text-sm font-medium text-[var(--color-primary)]">#{selectedRental.order_name}</span>
                  </div>
                )}
                {selectedRental.product?.size && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">Tamanho</span>
                    <span className="text-sm text-gray-700">{selectedRental.product.size}</span>
                  </div>
                )}
                {selectedRental.product?.color && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">Cor</span>
                    <span className="text-sm text-gray-700">{selectedRental.product.color}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Criado em</span>
                  <span className="text-sm text-gray-700">
                    {new Date(selectedRental.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedRental(null)}
                className="w-full mt-6 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 text-sm"
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
