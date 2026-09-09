import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Rental, Product, PaymentMethod } from '../types'

interface OrderInfo {
  order_name: string
  financial_status: string
  total_price: number
  subtotal: number
  shipping: number
  discount_amount: number
  line_items: any[]
}

interface EnrichedRental extends Rental {
  product?: Product
  order?: OrderInfo
  days_until_pickup: number
  paid_amount: number
  pending_amount: number
}

export function Reservations() {
  const [rentals, setRentals] = useState<EnrichedRental[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [selectedRental, setSelectedRental] = useState<EnrichedRental | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<EnrichedRental | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState<EnrichedRental | null>(null)
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    payment_method: 'pix' as PaymentMethod,
  })

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
      const orderNames = [...new Set((rentalsData || []).map((r) => r.order_name).filter(Boolean))]

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

      let ordersMap: Record<string, OrderInfo> = {}
      if (orderNames.length > 0) {
        const { data: ordersData } = await supabase
          .from('orders')
          .select('order_name, financial_status, total_price, subtotal, shipping, discount_amount, line_items')
          .in('order_name', orderNames)
        if (ordersData) {
          ordersMap = Object.fromEntries(ordersData.map((o) => [o.order_name, o]))
        }
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const enriched: EnrichedRental[] = (rentalsData || []).map((r) => {
        const order = ordersMap[r.order_name || '']
        const startDate = new Date(r.start_date)
        startDate.setHours(0, 0, 0, 0)
        const daysUntil = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        const totalOrder = order?.total_price || r.total_price || 0
        const isPaid = order?.financial_status === 'paid' || order?.financial_status === 'partially_paid'
        const paidAmount = isPaid ? totalOrder : 0
        const pendingAmount = isPaid ? 0 : totalOrder

        return {
          ...r,
          product: productsMap[r.product_id],
          order,
          days_until_pickup: daysUntil,
          paid_amount: paidAmount,
          pending_amount: pendingAmount,
        }
      })

      setRentals(enriched)
    } catch (error) {
      console.error('Erro ao carregar reservas:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtered = rentals.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false
    if (search) {
      const term = search.toLowerCase()
      const productName = r.product?.name?.toLowerCase() || ''
      const brand = r.product?.brand?.toLowerCase() || ''
      const orderName = r.order_name?.toLowerCase() || ''
      if (!productName.includes(term) && !brand.includes(term) && !orderName.includes(term)) return false
    }
    if (dateFrom && r.start_date < dateFrom) return false
    if (dateTo && r.start_date > dateTo) return false
    if (paymentFilter) {
      const pStatus = r.order?.financial_status || 'pending'
      if (pStatus !== paymentFilter) return false
    }
    return true
  })

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

  const paymentStatusColors: Record<string, string> = {
    paid: 'bg-green-100 text-green-700',
    partially_paid: 'bg-yellow-100 text-yellow-700',
    pending: 'bg-red-100 text-red-700',
    refunded: 'bg-gray-100 text-gray-700',
  }

  const paymentStatusLabels: Record<string, string> = {
    paid: 'Pago',
    partially_paid: 'Parcial',
    pending: 'Pendente',
    refunded: 'Estornado',
  }

  function getPickupLabel(days: number) {
    if (days < 0) return { text: `${Math.abs(days)}d atrasada`, color: 'text-red-600' }
    if (days === 0) return { text: 'Retira hoje', color: 'text-orange-600' }
    if (days === 1) return { text: 'Retira amanhã', color: 'text-blue-600' }
    return { text: `Faltam ${days} dias`, color: 'text-gray-500' }
  }

  async function handleDeleteRental(rental: EnrichedRental) {
    try {
      const { error } = await supabase
        .from('rentals')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', rental.id)

      if (error) throw error

      if (rental.product_id) {
        await supabase
          .from('products')
          .update({ operational_status: 'available' })
          .eq('id', rental.product_id)
      }

      setShowDeleteConfirm(null)
      setSelectedRental(null)
      loadRentals()
    } catch (error) {
      console.error('Erro ao cancelar reserva:', error)
      alert('Erro ao cancelar reserva.')
    }
  }

  async function handleRegisterPayment() {
    if (!showPaymentModal) return

    try {
      await supabase.from('rental_transactions').insert({
        rental_id: showPaymentModal.id,
        amount: paymentForm.amount,
        payment_method: paymentForm.payment_method,
        status: 'completed',
        transaction_type: 'payment',
      })

      if (showPaymentModal.order_name) {
        await supabase
          .from('orders')
          .update({ financial_status: 'paid', paid_at: new Date().toISOString() })
          .eq('order_name', showPaymentModal.order_name)
      }

      setShowPaymentModal(null)
      setPaymentForm({ amount: 0, payment_method: 'pix' })
      loadRentals()
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error)
      alert('Erro ao registrar pagamento.')
    }
  }

  function openPaymentModal(rental: EnrichedRental) {
    setShowPaymentModal(rental)
    setPaymentForm({
      amount: rental.pending_amount || rental.total_price || 0,
      payment_method: 'pix',
    })
  }

  const paymentMethodLabels: Record<string, string> = {
    pix: 'PIX',
    credit: 'Crédito',
    debit: 'Débito',
    cash: 'Dinheiro',
    transfer: 'Transferência',
    payment_link: 'Link de Pgto',
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
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Buscar produto, marca ou pedido..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm"
          >
            <option value="">Todos os status</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm"
          >
            <option value="">Pagamento</option>
            <option value="paid">Pago</option>
            <option value="partially_paid">Parcial</option>
            <option value="pending">Pendente</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm"
            placeholder="Data início"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm"
            placeholder="Data fim"
          />
        </div>
        {(search || statusFilter || paymentFilter || dateFrom || dateTo) && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              {filtered.length} reserva{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => { setSearch(''); setStatusFilter(''); setPaymentFilter(''); setDateFrom(''); setDateTo('') }}
              className="text-sm text-[var(--color-accent)] hover:underline"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {filtered.map((rental) => {
          const pickup = getPickupLabel(rental.days_until_pickup)
          const paymentStatus = rental.order?.financial_status || 'pending'

          return (
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
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${statusColors[rental.status]}`}>
                      {statusLabels[rental.status]}
                    </span>
                  </div>

                  {rental.product?.brand && (
                    <p className="text-xs text-gray-500 mt-0.5">{rental.product.brand}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                    <span className="text-gray-500">📅 {rental.start_date} → {rental.end_date}</span>
                    <span className={`font-medium ${pickup.color}`}>📦 {pickup.text}</span>
                    {rental.order_name && (
                      <span className="text-gray-400">#{rental.order_name}</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-1.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${paymentStatusColors[paymentStatus]}`}>
                      💳 {paymentStatusLabels[paymentStatus]}
                    </span>
                    {rental.total_price && (
                      <span className="text-xs font-medium text-[var(--color-primary)]">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rental.total_price)}
                      </span>
                    )}
                    {rental.pending_amount > 0 && (
                      <span className="text-xs text-red-500">
                        Pendente: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rental.pending_amount)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {(paymentStatus === 'pending' || rental.status === 'pending' || rental.status === 'pending_payment') && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); openPaymentModal(rental) }}
                        className="p-2 rounded-lg hover:bg-green-50 text-green-500 hover:text-green-700 transition-colors"
                        title="Registrar pagamento"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(rental) }}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                        title="Cancelar reserva"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setSelectedRental(rental)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[var(--color-primary)] transition-colors"
                    title="Ver detalhes"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )
        })}
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

              <div className="space-y-1">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Status</span>
                  <span className={`text-sm font-medium px-2.5 py-0.5 rounded-full ${statusColors[selectedRental.status]}`}>
                    {statusLabels[selectedRental.status]}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Retirada</span>
                  <div className="text-right">
                    <span className="text-sm font-medium text-[var(--color-primary)]">{selectedRental.start_date}</span>
                    <span className={`block text-xs ${getPickupLabel(selectedRental.days_until_pickup).color}`}>
                      {getPickupLabel(selectedRental.days_until_pickup).text}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Devolução</span>
                  <span className="text-sm font-medium text-[var(--color-primary)]">{selectedRental.end_date}</span>
                </div>

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
              </div>

              {selectedRental.order && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-[var(--color-primary)] mb-3">Financeiro</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-1">
                    <div className="flex justify-between py-1">
                      <span className="text-sm text-gray-500">Status do pagamento</span>
                      <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${paymentStatusColors[selectedRental.order.financial_status]}`}>
                        {paymentStatusLabels[selectedRental.order.financial_status] || selectedRental.order.financial_status}
                      </span>
                    </div>
                    {selectedRental.order.subtotal > 0 && (
                      <div className="flex justify-between py-1">
                        <span className="text-sm text-gray-500">Subtotal</span>
                        <span className="text-sm text-gray-700">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedRental.order.subtotal)}
                        </span>
                      </div>
                    )}
                    {selectedRental.order.shipping > 0 && (
                      <div className="flex justify-between py-1">
                        <span className="text-sm text-gray-500">Frete</span>
                        <span className="text-sm text-gray-700">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedRental.order.shipping)}
                        </span>
                      </div>
                    )}
                    {selectedRental.order.discount_amount > 0 && (
                      <div className="flex justify-between py-1">
                        <span className="text-sm text-gray-500">Desconto</span>
                        <span className="text-sm text-green-600">
                          -{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedRental.order.discount_amount)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between py-1 border-t border-gray-200 mt-1 pt-2">
                      <span className="text-sm font-medium text-[var(--color-primary)]">Total</span>
                      <span className="text-sm font-bold text-[var(--color-primary)]">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedRental.order.total_price)}
                      </span>
                    </div>
                  </div>

                  {selectedRental.order.line_items && selectedRental.order.line_items.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-[var(--color-primary)] mb-3">Itens do Pedido</h4>
                      <div className="space-y-2">
                        {selectedRental.order.line_items.map((item: any, index: number) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-3">
                            <p className="text-sm font-medium text-[var(--color-primary)]">{item.name}</p>
                            <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                              {item.size && <span>Tam: {item.size}</span>}
                              {item.period && <span>Período: {item.period}</span>}
                              {item.dates && <span>{item.dates}</span>}
                              {item.quantity > 1 && <span>Qtd: {item.quantity}</span>}
                            </div>
                            {item.price && (
                              <p className="text-sm font-medium text-[var(--color-primary)] mt-1">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between py-2 mt-4 border-t border-gray-100">
                <span className="text-sm text-gray-500">Criado em</span>
                <span className="text-sm text-gray-700">
                  {new Date(selectedRental.created_at).toLocaleDateString('pt-BR')}
                </span>
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

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-2">Cancelar Reserva</h3>
            <p className="text-sm text-gray-500 mb-4">
              Tem certeza que deseja cancelar a reserva de <strong>{showDeleteConfirm.product?.name}</strong>?
              Essa ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 text-sm"
              >
                Não, manter
              </button>
              <button
                onClick={() => handleDeleteRental(showDeleteConfirm)}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium"
              >
                Sim, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">Registrar Pagamento</h3>

            <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 rounded-lg">
              {showPaymentModal.product?.image_url ? (
                <img src={showPaymentModal.product.image_url} alt="" className="w-10 h-12 rounded object-cover" />
              ) : (
                <div className="w-10 h-12 rounded bg-gray-200 flex items-center justify-center">👗</div>
              )}
              <div>
                <p className="text-sm font-medium text-[var(--color-primary)]">{showPaymentModal.product?.name}</p>
                <p className="text-xs text-gray-500">{showPaymentModal.start_date} → {showPaymentModal.end_date}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                <input
                  type="number"
                  value={paymentForm.amount || ''}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value as PaymentMethod })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                >
                  {Object.entries(paymentMethodLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPaymentModal(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegisterPayment}
                className="flex-1 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
              >
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
