import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Rental, Product } from '../types'

interface EnrichedRental extends Rental {
  product?: Product
  days_until: number
}

export function Pickup() {
  const [rentals, setRentals] = useState<EnrichedRental[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'today' | 'tomorrow' | 'overdue'>('all')
  const [confirmPickup, setConfirmPickup] = useState<EnrichedRental | null>(null)
  const [checklist, setChecklist] = useState({
    payment_checked: false,
    products_separated: false,
    deposit_registered: false,
    customer_identified: false,
  })

  useEffect(() => {
    loadRentals()
  }, [])

  async function loadRentals() {
    try {
      const { data: rentalsData, error } = await supabase
        .from('rentals')
        .select('*')
        .in('status', ['confirmed', 'ready_for_pickup', 'preparing'])
        .order('start_date')

      if (error) throw error

      const productIds = [...new Set((rentalsData || []).map((r) => r.product_id).filter(Boolean))]

      let productsMap: Record<string, Product> = {}
      if (productIds.length > 0) {
        const { data: productsData } = await supabase
          .from('products')
          .select('id, name, brand, category, image_url, size, color')
          .in('id', productIds)
        if (productsData) {
          productsMap = Object.fromEntries(productsData.map((p) => [p.id, p]))
        }
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const enriched: EnrichedRental[] = (rentalsData || []).map((r) => {
        const startDate = new Date(r.start_date)
        startDate.setHours(0, 0, 0, 0)
        const daysUntil = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        return {
          ...r,
          product: productsMap[r.product_id],
          days_until: daysUntil,
        }
      })

      setRentals(enriched)
    } catch (error) {
      console.error('Erro ao carregar retiradas:', error)
    } finally {
      setLoading(false)
    }
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const todayItems = rentals.filter((r) => r.start_date === todayStr)
  const tomorrowItems = rentals.filter((r) => r.start_date === tomorrowStr)
  const overdueItems = rentals.filter((r) => r.days_until < 0)

  const filtered = rentals.filter((r) => {
    if (filter === 'today') return r.start_date === todayStr
    if (filter === 'tomorrow') return r.start_date === tomorrowStr
    if (filter === 'overdue') return r.days_until < 0
    return true
  })

  function resetChecklist() {
    setChecklist({
      payment_checked: false,
      products_separated: false,
      deposit_registered: false,
      customer_identified: false,
    })
  }

  async function handleConfirmPickup() {
    if (!confirmPickup) return

    const allChecked = Object.values(checklist).every(Boolean)
    if (!allChecked) {
      alert('Complete todos os itens do checklist.')
      return
    }

    try {
      const { error } = await supabase
        .from('rentals')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', confirmPickup.id)

      if (error) throw error

      if (confirmPickup.product_id) {
        await supabase
          .from('products')
          .update({ operational_status: 'rented' })
          .eq('id', confirmPickup.product_id)
      }

      await supabase.from('product_operations').insert({
        product_id: confirmPickup.product_id,
        rental_id: confirmPickup.id,
        operation_type: 'rental',
        notes: 'Retirada confirmada',
      })

      alert('Retirada confirmada! Status alterado para Ativa.')
      setConfirmPickup(null)
      resetChecklist()
      loadRentals()
    } catch (error) {
      console.error('Erro ao confirmar retirada:', error)
      alert('Erro ao confirmar retirada.')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-400">Carregando...</div></div>
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={() => setFilter('today')}
          className={`p-4 rounded-xl border text-left transition-all ${
            filter === 'today'
              ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5 ring-2 ring-[var(--color-accent)]/20'
              : todayItems.length > 0 ? 'border-orange-200 bg-orange-50 hover:border-orange-300' : 'border-gray-100 bg-white hover:border-gray-200'
          }`}
        >
          <p className="text-2xl font-bold text-[var(--color-primary)]">{todayItems.length}</p>
          <p className="text-xs text-gray-500">Hoje</p>
        </button>
        <button
          onClick={() => setFilter('tomorrow')}
          className={`p-4 rounded-xl border text-left transition-all ${
            filter === 'tomorrow'
              ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5 ring-2 ring-[var(--color-accent)]/20'
              : tomorrowItems.length > 0 ? 'border-blue-200 bg-blue-50 hover:border-blue-300' : 'border-gray-100 bg-white hover:border-gray-200'
          }`}
        >
          <p className="text-2xl font-bold text-[var(--color-primary)]">{tomorrowItems.length}</p>
          <p className="text-xs text-gray-500">Amanhã</p>
        </button>
        <button
          onClick={() => setFilter('overdue')}
          className={`p-4 rounded-xl border text-left transition-all ${
            filter === 'overdue'
              ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5 ring-2 ring-[var(--color-accent)]/20'
              : overdueItems.length > 0 ? 'border-red-200 bg-red-50 hover:border-red-300' : 'border-gray-100 bg-white hover:border-gray-200'
          }`}
        >
          <p className="text-2xl font-bold text-[var(--color-primary)]">{overdueItems.length}</p>
          <p className="text-xs text-gray-500">Atrasados</p>
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`p-4 rounded-xl border text-left transition-all ${
            filter === 'all'
              ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5 ring-2 ring-[var(--color-accent)]/20'
              : 'border-gray-100 bg-white hover:border-gray-200'
          }`}
        >
          <p className="text-2xl font-bold text-[var(--color-primary)]">{rentals.length}</p>
          <p className="text-xs text-gray-500">Total</p>
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
          <p className="text-4xl mb-4">✅</p>
          <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-2">
            {filter === 'today' ? 'Nenhuma retirada hoje' :
             filter === 'tomorrow' ? 'Nenhuma retirada amanhã' :
             filter === 'overdue' ? 'Nenhum atrasado' :
             'Nenhuma retirada pendente'}
          </h3>
          <p className="text-gray-500">Todas as retiradas foram processadas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((rental) => {
            const isToday = rental.start_date === todayStr
            const isTomorrow = rental.start_date === tomorrowStr
            const isOverdue = rental.days_until < 0

            return (
              <div
                key={rental.id}
                className={`bg-white rounded-xl p-4 shadow-sm border transition-all ${
                  isOverdue ? 'border-red-200' :
                  isToday ? 'border-orange-200' :
                  isTomorrow ? 'border-blue-200' :
                  'border-gray-100'
                }`}
              >
                <div className="flex items-center gap-4">
                  {rental.product?.image_url ? (
                    <img src={rental.product.image_url} alt={rental.product.name} className="w-14 h-18 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-18 rounded-lg bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">👗</div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-sm text-[var(--color-primary)] truncate">
                        {rental.product?.name || 'Produto'}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isOverdue && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                            {Math.abs(rental.days_until)}d atrasado
                          </span>
                        )}
                        {isToday && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                            Hoje
                          </span>
                        )}
                        {isTomorrow && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            Amanhã
                          </span>
                        )}
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          rental.status === 'ready_for_pickup' ? 'bg-green-100 text-green-700' :
                          rental.status === 'preparing' ? 'bg-purple-100 text-purple-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {rental.status === 'ready_for_pickup' ? 'Pronto' :
                           rental.status === 'preparing' ? 'Preparando' :
                           'Confirmado'}
                        </span>
                      </div>
                    </div>

                    {rental.product?.brand && (
                      <p className="text-xs text-gray-500 mt-0.5">{rental.product.brand}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                      <span>📅 {rental.start_date}</span>
                      {rental.product?.size && <span>📏 {rental.product.size.split(';')[0]}</span>}
                      {rental.product?.color && <span>🎨 {rental.product.color}</span>}
                      {rental.total_price && (
                        <span className="font-medium text-[var(--color-primary)]">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rental.total_price)}
                        </span>
                      )}
                      {rental.order_name && <span className="text-gray-400">#{rental.order_name}</span>}
                    </div>
                  </div>

                  <button
                    onClick={() => { setConfirmPickup(rental); resetChecklist() }}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors flex-shrink-0"
                  >
                    ✓ Retirado
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {confirmPickup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">Confirmar Retirada</h3>

            <div className="flex items-start gap-4 mb-6 p-3 bg-gray-50 rounded-lg">
              {confirmPickup.product?.image_url ? (
                <img src={confirmPickup.product.image_url} alt="" className="w-16 h-20 rounded-lg object-cover" />
              ) : (
                <div className="w-16 h-20 rounded-lg bg-gray-200 flex items-center justify-center text-2xl">👗</div>
              )}
              <div>
                <p className="font-medium text-[var(--color-primary)]">{confirmPickup.product?.name}</p>
                {confirmPickup.product?.brand && <p className="text-xs text-gray-500">{confirmPickup.product.brand}</p>}
                <p className="text-xs text-gray-500 mt-1">📅 {confirmPickup.start_date}</p>
                {confirmPickup.order_name && <p className="text-xs text-gray-400">#{confirmPickup.order_name}</p>}
              </div>
            </div>

            <div className="space-y-2 mb-6">
              {[
                { key: 'payment_checked', label: 'Pagamento conferido' },
                { key: 'products_separated', label: 'Produtos separados' },
                { key: 'deposit_registered', label: 'Caução registrada' },
                { key: 'customer_identified', label: 'Cliente identificado' },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist[item.key as keyof typeof checklist]}
                    onChange={(e) => setChecklist({ ...checklist, [item.key]: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                  />
                  <span className="text-sm text-gray-700">{item.label}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setConfirmPickup(null); resetChecklist() }} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button
                onClick={handleConfirmPickup}
                disabled={!Object.values(checklist).every(Boolean)}
                className="flex-1 py-2.5 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar Retirada
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
