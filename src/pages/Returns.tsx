import { useEffect, useState } from 'react'
import { getRentals, processReturn } from '../services/supabase'
import type { Rental, Customer, Product, InspectionResult } from '../types'

type RentalWithRelations = Rental & { customers: Customer; products: Product }

export function Returns() {
  const [rentals, setRentals] = useState<RentalWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRental, setSelectedRental] = useState<RentalWithRelations | null>(null)
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

  useEffect(() => {
    loadRentals()
  }, [])

  async function loadRentals() {
    try {
      const data = await getRentals('active')
      setRentals(data as RentalWithRelations[])
    } catch (error) {
      console.error('Erro ao carregar devoluções:', error)
    } finally {
      setLoading(false)
    }
  }

  function getResult(): InspectionResult {
    if (!inspection.no_damage || inspection.has_stains || inspection.has_tears || !inspection.zipper_working || !inspection.buttons_complete || !inspection.embroidery_complete) {
      if (inspection.damage_description.toLowerCase().includes('manutenção') || inspection.damage_description.toLowerCase().includes('rasgo grande')) {
        return 'maintenance_needed'
      }
      return 'damage'
    }
    return 'approved'
  }

  async function handleProcessReturn() {
    if (!selectedRental) return

    setSubmitting(true)

    try {
      const result = getResult()

      await processReturn(selectedRental.id, result, {
        has_stains: inspection.has_stains,
        has_tears: inspection.has_tears,
        zipper_working: inspection.zipper_working,
        buttons_complete: inspection.buttons_complete,
        embroidery_complete: inspection.embroidery_complete,
        no_damage: inspection.no_damage,
        damage_description: inspection.damage_description || undefined,
        damage_charge: inspection.damage_charge,
      })

      const resultLabels = {
        approved: 'aprovada para higienização',
        damage: 'registrada com avaria',
        maintenance_needed: 'encaminhada para manutenção',
      }

      alert(`Devolução ${resultLabels[result]}!`)
      setSelectedRental(null)
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
        <div className="text-gray-400">Carregando devoluções...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-500">
        {rentals.length} locação{rentals.length !== 1 ? 'ões' : ''} ativa{rentals.length !== 1 ? 's' : ''}
      </div>

      {rentals.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
          <p className="text-4xl mb-4">↩</p>
          <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-2">Nenhuma devolução pendente</h3>
          <p className="text-gray-500">Não há locações ativas aguardando devolução.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {rentals.map((rental) => (
              <div
                key={rental.id}
                onClick={() => setSelectedRental(rental)}
                className={`bg-white rounded-xl p-6 shadow-sm border cursor-pointer transition-all ${
                  selectedRental?.id === rental.id
                    ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[var(--color-primary)]">
                    {rental.customers?.first_name} {rental.customers?.last_name}
                  </h3>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                    Ativa
                  </span>
                </div>
                <p className="text-sm text-gray-500">{rental.products?.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {rental.start_date} → {rental.end_date}
                </p>
                {rental.total_price && (
                  <p className="text-sm font-medium text-[var(--color-primary)] mt-2">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rental.total_price)}
                  </p>
                )}
              </div>
            ))}
          </div>

          {selectedRental && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 sticky top-24">
              <h3 className="font-semibold text-[var(--color-primary)] mb-4">Inspeção de Devolução</h3>

              <div className="mb-6">
                <p className="font-medium text-[var(--color-primary)]">
                  {selectedRental.customers?.first_name} {selectedRental.customers?.last_name}
                </p>
                <p className="text-sm text-gray-500">{selectedRental.products?.name}</p>
              </div>

              <div className="space-y-3">
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
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={item.invert ? !inspection[item.key as keyof typeof inspection] : inspection[item.key as keyof typeof inspection] as boolean}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição do dano (se houver)</label>
                <textarea
                  value={inspection.damage_description}
                  onChange={(e) => setInspection({ ...inspection, damage_description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                  rows={3}
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Cobrança por dano (R$)</label>
                <input
                  type="number"
                  value={inspection.damage_charge || ''}
                  onChange={(e) => setInspection({ ...inspection, damage_charge: Number(e.target.value) })}
                  placeholder="0,00"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                />
              </div>

              <button
                onClick={handleProcessReturn}
                disabled={submitting}
                className="w-full mt-6 py-3 bg-[var(--color-accent)] text-white rounded-lg font-semibold hover:bg-[var(--color-accent-light)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Processando...' : 'Processar Devolução'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
