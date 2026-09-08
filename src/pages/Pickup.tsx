import { useEffect, useState } from 'react'
import { getRentals, updateRentalStatus } from '../services/supabase'
import type { Rental, Customer, Product } from '../types'

type RentalWithRelations = Rental & { customers: Customer; products: Product }

export function Pickup() {
  const [rentals, setRentals] = useState<RentalWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRental, setSelectedRental] = useState<RentalWithRelations | null>(null)
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
      const data = await getRentals('ready_for_pickup')
      setRentals(data as RentalWithRelations[])
    } catch (error) {
      console.error('Erro ao carregar retiradas:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmPickup() {
    if (!selectedRental) return

    const allChecked = Object.values(checklist).every(Boolean)
    if (!allChecked) {
      alert('Complete todos os itens do checklist antes de confirmar.')
      return
    }

    try {
      await updateRentalStatus(selectedRental.id, 'active')
      alert('Retirada confirmada! Status alterado para Ativa.')
      setSelectedRental(null)
      setChecklist({
        payment_checked: false,
        products_separated: false,
        deposit_registered: false,
        customer_identified: false,
      })
      loadRentals()
    } catch (error) {
      console.error('Erro ao confirmar retirada:', error)
      alert('Erro ao confirmar retirada.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Carregando retiradas...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-500">
        {rentals.length} retirada{rentals.length !== 1 ? 's' : ''} pendente{rentals.length !== 1 ? 's' : ''} hoje
      </div>

      {rentals.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
          <p className="text-4xl mb-4">📦</p>
          <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-2">Nenhuma retirada pendente</h3>
          <p className="text-gray-500">Não há retiradas agendadas para hoje.</p>
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
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700">
                    Pronta p/ Retirada
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
              <h3 className="font-semibold text-[var(--color-primary)] mb-4">Checklist de Retirada</h3>

              <div className="mb-6">
                <p className="font-medium text-[var(--color-primary)]">
                  {selectedRental.customers?.first_name} {selectedRental.customers?.last_name}
                </p>
                <p className="text-sm text-gray-500">{selectedRental.products?.name}</p>
              </div>

              <div className="space-y-3">
                {[
                  { key: 'payment_checked', label: 'Pagamento conferido' },
                  { key: 'products_separated', label: 'Produtos separados' },
                  { key: 'deposit_registered', label: 'Caução registrada' },
                  { key: 'customer_identified', label: 'Cliente identificado' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
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

              <button
                onClick={handleConfirmPickup}
                disabled={!Object.values(checklist).every(Boolean)}
                className="w-full mt-6 py-3 bg-[var(--color-accent)] text-white rounded-lg font-semibold hover:bg-[var(--color-accent-light)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar Retirada
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
