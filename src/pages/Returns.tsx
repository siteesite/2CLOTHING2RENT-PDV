import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Rental, Product } from '../types'

interface ActiveRental extends Rental {
  product?: Product
  is_overdue: boolean
  days_overdue: number
}

export function Returns() {
  const [rentals, setRentals] = useState<ActiveRental[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRental, setSelectedRental] = useState<ActiveRental | null>(null)
  const [inspection, setInspection] = useState({
    has_stains: false,
    has_tears: false,
    zipper_working: true,
    buttons_complete: true,
    embroidery_complete: true,
    no_damage: true,
    damage_description: '',
    damage_charge: 0,
  })
  const [submitting, setSubmitting] = useState(false)
  const [filter, setFilter] = useState<'all' | 'today' | 'overdue'>('all')

  useEffect(() => {
    loadRentals()
  }, [])

  async function loadRentals() {
    try {
      const today = new Date().toISOString().split('T')[0]

      const { data: rentalsData, error: rentalsError } = await supabase
        .from('rentals')
        .select('*')
        .eq('status', 'active')
        .order('end_date')

      if (rentalsError) throw rentalsError

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

      const enriched: ActiveRental[] = (rentalsData || []).map((r) => {
        const isOverdue = r.end_date < today
        const daysOverdue = isOverdue
          ? Math.ceil((new Date().getTime() - new Date(r.end_date).getTime()) / (1000 * 60 * 60 * 24))
          : 0

        return {
          ...r,
          product: productsMap[r.product_id],
          is_overdue: isOverdue,
          days_overdue: daysOverdue,
        }
      })

      setRentals(enriched)
    } catch (error) {
      console.error('Erro ao carregar locações:', error)
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const filteredRentals = rentals.filter((r) => {
    if (filter === 'today') return r.end_date === today
    if (filter === 'overdue') return r.is_overdue
    return true
  })

  function resetInspection() {
    setInspection({
      has_stains: false,
      has_tears: false,
      zipper_working: true,
      buttons_complete: true,
      embroidery_complete: true,
      no_damage: true,
      damage_description: '',
      damage_charge: 0,
    })
  }

  async function handleProcessReturn() {
    if (!selectedRental) return
    setSubmitting(true)

    try {
      const hasDamage = !inspection.no_damage || inspection.has_stains || inspection.has_tears ||
        !inspection.zipper_working || !inspection.buttons_complete || !inspection.embroidery_complete

      const newStatus = hasDamage
        ? (inspection.damage_description.toLowerCase().includes('manutenção') ? 'maintenance' : 'cleaning')
        : 'cleaning'

      const { error: rentalError } = await supabase
        .from('rentals')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', selectedRental.id)

      if (rentalError) throw rentalError

      await supabase.from('rental_inspections').insert({
        rental_id: selectedRental.id,
        result: hasDamage ? 'damage' : 'approved',
        has_stains: inspection.has_stains,
        has_tears: inspection.has_tears,
        zipper_working: inspection.zipper_working,
        buttons_complete: inspection.buttons_complete,
        embroidery_complete: inspection.embroidery_complete,
        no_damage: inspection.no_damage,
        damage_description: inspection.damage_description || null,
        damage_charge: inspection.damage_charge || 0,
      })

      if (selectedRental.product_id) {
        await supabase
          .from('products')
          .update({ operational_status: newStatus === 'maintenance' ? 'maintenance' : 'cleaning' })
          .eq('id', selectedRental.product_id)
      }

      await supabase.from('product_operations').insert({
        product_id: selectedRental.product_id,
        rental_id: selectedRental.id,
        operation_type: 'return',
        notes: inspection.damage_description || 'Devolução processada',
      })

      if (inspection.damage_charge > 0) {
        await supabase.from('rental_transactions').insert({
          rental_id: selectedRental.id,
          amount: inspection.damage_charge,
          payment_method: 'pix',
          status: 'completed',
          transaction_type: 'damage_charge',
          notes: inspection.damage_description,
        })
      }

      alert('Devolução registrada com sucesso!')
      setSelectedRental(null)
      resetInspection()
      loadRentals()
    } catch (error) {
      console.error('Erro ao processar devolução:', error)
      alert('Erro ao processar devolução.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'Todas', count: rentals.length },
            { key: 'today', label: 'Devem hoje', count: rentals.filter((r) => r.end_date === today).length },
            { key: 'overdue', label: 'Atrasadas', count: rentals.filter((r) => r.is_overdue).length },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f.key
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>

      {filteredRentals.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
          <p className="text-4xl mb-4">✅</p>
          <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-2">
            {filter === 'overdue' ? 'Nenhuma atrasada' : filter === 'today' ? 'Nenhuma devolução hoje' : 'Nenhuma peça na rua'}
          </h3>
          <p className="text-gray-500">Todas as locações foram devolvidas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            {filteredRentals.map((rental) => (
              <div
                key={rental.id}
                onClick={() => { setSelectedRental(rental); resetInspection() }}
                className={`bg-white rounded-xl p-4 shadow-sm border cursor-pointer transition-all ${
                  selectedRental?.id === rental.id
                    ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20'
                    : rental.is_overdue
                    ? 'border-red-200 hover:border-red-300'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  {rental.product?.image_url ? (
                    <img
                      src={rental.product.image_url}
                      alt={rental.product.name}
                      className="w-16 h-20 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-20 rounded-lg bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">
                      👗
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-sm text-[var(--color-primary)] truncate">
                        {rental.product?.name || 'Produto'}
                      </h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                        rental.is_overdue
                          ? 'bg-red-100 text-red-700'
                          : rental.end_date === today
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {rental.is_overdue
                          ? `${rental.days_overdue}d atraso`
                          : rental.end_date === today
                          ? 'Devolve hoje'
                          : `Até ${rental.end_date}`}
                      </span>
                    </div>
                    {rental.product?.brand && (
                      <p className="text-xs text-gray-500 mt-0.5">{rental.product.brand}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>📅 {rental.start_date} → {rental.end_date}</span>
                      {rental.product?.size && <span>📏 {rental.product.size.split(';')[0]}</span>}
                      {rental.product?.color && <span>🎨 {rental.product.color}</span>}
                    </div>
                    {rental.total_price && (
                      <p className="text-xs font-medium text-[var(--color-primary)] mt-1">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rental.total_price)}
                      </p>
                    )}
                    {rental.order_name && (
                      <p className="text-xs text-gray-400 mt-0.5">Pedido: {rental.order_name}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedRental && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 sticky top-24">
              <h3 className="font-semibold text-[var(--color-primary)] mb-4">Inspeção de Devolução</h3>

              <div className="flex items-start gap-4 mb-6 pb-4 border-b border-gray-100">
                {selectedRental.product?.image_url ? (
                  <img
                    src={selectedRental.product.image_url}
                    alt={selectedRental.product.name}
                    className="w-20 h-24 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-20 h-24 rounded-lg bg-gray-100 flex items-center justify-center text-3xl">👗</div>
                )}
                <div>
                  <p className="font-medium text-[var(--color-primary)]">{selectedRental.product?.name}</p>
                  {selectedRental.product?.brand && (
                    <p className="text-sm text-gray-500">{selectedRental.product.brand}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedRental.start_date} → {selectedRental.end_date}
                  </p>
                  {selectedRental.is_overdue && (
                    <p className="text-sm font-medium text-[var(--color-danger)] mt-1">
                      {selectedRental.days_overdue} dia(s) de atraso
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {[
                  { key: 'no_damage', label: 'Sem danos', positive: true },
                  { key: 'has_stains', label: 'Sem manchas', positive: false, invert: true },
                  { key: 'has_tears', label: 'Sem rasgos', positive: false, invert: true },
                  { key: 'zipper_working', label: 'Zíper funcionando', positive: true },
                  { key: 'buttons_complete', label: 'Botões completos', positive: true },
                  { key: 'embroidery_complete', label: 'Bordados completos', positive: true },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={item.invert ? !inspection[item.key as keyof typeof inspection] as boolean : inspection[item.key as keyof typeof inspection] as boolean}
                      onChange={(e) => {
                        const value = item.invert ? !e.target.checked : e.target.checked
                        setInspection({ ...inspection, [item.key]: value })
                      }}
                      className="w-5 h-5 rounded border-gray-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                    />
                    <span className="text-sm text-gray-700">{item.label}</span>
                  </label>
                ))}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea
                  value={inspection.damage_description}
                  onChange={(e) => setInspection({ ...inspection, damage_description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-sm"
                  rows={2}
                  placeholder="Descreva avarias, se houver..."
                />
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Cobrança por dano (R$)</label>
                <input
                  type="number"
                  value={inspection.damage_charge || ''}
                  onChange={(e) => setInspection({ ...inspection, damage_charge: Number(e.target.value) })}
                  placeholder="0,00"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-sm"
                />
              </div>

              <button
                onClick={handleProcessReturn}
                disabled={submitting}
                className="w-full mt-6 py-3 bg-[var(--color-accent)] text-white rounded-lg font-semibold hover:bg-[var(--color-accent-light)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Processando...' : 'Registrar Devolução'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
