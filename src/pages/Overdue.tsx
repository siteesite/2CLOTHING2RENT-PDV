import { useEffect, useState } from 'react'
import { getRentals } from '../services/supabase'
import type { Rental, Customer, Product } from '../types'

type RentalWithRelations = Rental & { customers: Customer; products: Product }

export function Overdue() {
  const [rentals, setRentals] = useState<RentalWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOverdueRentals()
  }, [])

  async function loadOverdueRentals() {
    try {
      const data = await getRentals('active')
      const today = new Date().toISOString().split('T')[0]
      const overdue = (data as RentalWithRelations[]).filter((r) => r.end_date < today)
      setRentals(overdue)
    } catch (error) {
      console.error('Erro ao carregar atrasos:', error)
    } finally {
      setLoading(false)
    }
  }

  function getDaysOverdue(endDate: string) {
    const end = new Date(endDate)
    const today = new Date()
    const diff = Math.ceil((today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  function calculateLateFee(daysOverdue: number) {
    return daysOverdue * 50
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Carregando atrasos...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-500">
        {rentals.length} locação{rentals.length !== 1 ? 'ões' : ''} em atraso
      </div>

      {rentals.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
          <p className="text-4xl mb-4">✅</p>
          <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-2">Nenhum atraso</h3>
          <p className="text-gray-500">Todas as locações estão dentro do prazo.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rentals.map((rental) => {
            const daysOverdue = getDaysOverdue(rental.end_date)
            const lateFee = calculateLateFee(daysOverdue)

            return (
              <div key={rental.id} className="bg-white rounded-xl p-6 shadow-sm border border-red-100">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-[var(--color-primary)]">
                      {rental.customers?.first_name} {rental.customers?.last_name}
                    </h3>
                    <p className="text-sm text-gray-500">{rental.products?.name}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Previsão: {rental.end_date}
                    </p>
                    {rental.customers?.phone && (
                      <p className="text-sm text-gray-500 mt-1">
                        📱 {rental.customers.phone}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                      {daysOverdue} dia{daysOverdue !== 1 ? 's' : ''} de atraso
                    </span>
                    <p className="text-sm font-medium text-[var(--color-danger)] mt-2">
                      Multa: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lateFee)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                  {rental.customers?.phone && (
                    <a
                      href={`https://wa.me/55${rental.customers.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2.5 bg-green-500 text-white rounded-lg font-medium text-center hover:bg-green-600 transition-colors"
                    >
                      WhatsApp
                    </a>
                  )}
                  <button className="flex-1 py-2.5 bg-[var(--color-accent)] text-white rounded-lg font-medium hover:bg-[var(--color-accent-light)] transition-colors">
                    Registrar Pagamento
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
