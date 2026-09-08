import { useEffect, useState } from 'react'
import { getRentals, getTransactions, getDeposits, registerPayment, registerDeposit } from '../services/supabase'
import type { Rental, Customer, Product, RentalTransaction, RentalDeposit, PaymentMethod } from '../types'

type RentalWithRelations = Rental & { customers: Customer; products: Product }

export function Cashier() {
  const [rentals, setRentals] = useState<RentalWithRelations[]>([])
  const [transactions, setTransactions] = useState<RentalTransaction[]>([])
  const [deposits, setDeposits] = useState<RentalDeposit[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRental, setSelectedRental] = useState<RentalWithRelations | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    payment_method: 'pix' as PaymentMethod,
    notes: '',
  })
  const [depositForm, setDepositForm] = useState({
    amount: 0,
    payment_method: 'pix' as PaymentMethod,
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [rentalsData, transactionsData, depositsData] = await Promise.all([
        getRentals(),
        getTransactions(),
        getDeposits(),
      ])
      setRentals(rentalsData as RentalWithRelations[])
      setTransactions(transactionsData)
      setDeposits(depositsData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  function getRentalPayments(rentalId: string) {
    return transactions.filter((t) => t.rental_id === rentalId && t.transaction_type === 'payment' && t.status === 'completed')
  }

  function getRentalDeposit(rentalId: string) {
    return deposits.find((d) => d.rental_id === rentalId && d.status === 'held')
  }

  function getTotalPaid(rentalId: string) {
    return getRentalPayments(rentalId).reduce((sum, t) => sum + t.amount, 0)
  }

  function getBalance(rental: Rental) {
    const totalPaid = getTotalPaid(rental.id)
    return (rental.total_price || 0) - totalPaid
  }

  async function handlePayment() {
    if (!selectedRental) return

    try {
      await registerPayment(
        selectedRental.id,
        paymentForm.amount,
        paymentForm.payment_method,
        'payment',
        paymentForm.notes
      )
      setShowPaymentModal(false)
      setPaymentForm({ amount: 0, payment_method: 'pix', notes: '' })
      loadData()
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error)
      alert('Erro ao registrar pagamento.')
    }
  }

  async function handleDeposit() {
    if (!selectedRental) return

    try {
      await registerDeposit(
        selectedRental.id,
        depositForm.amount,
        depositForm.payment_method
      )
      setShowDepositModal(false)
      setDepositForm({ amount: 0, payment_method: 'pix' })
      loadData()
    } catch (error) {
      console.error('Erro ao registrar caução:', error)
      alert('Erro ao registrar caução.')
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const todayTransactions = transactions.filter((t) => t.created_at.startsWith(today) && t.status === 'completed')
  const todayRevenue = todayTransactions
    .filter((t) => t.transaction_type === 'payment')
    .reduce((sum, t) => sum + t.amount, 0)
  const todayDeposits = todayTransactions
    .filter((t) => t.transaction_type === 'deposit')
    .reduce((sum, t) => sum + t.amount, 0)

  const paymentMethodLabels: Record<string, string> = {
    pix: 'PIX',
    credit: 'Crédito',
    debit: 'Débito',
    cash: 'Dinheiro',
    transfer: 'Transferência',
    payment_link: 'Link de Pgto',
  }

  const transactionTypeLabels: Record<string, string> = {
    payment: 'Pagamento',
    deposit: 'Caução',
    refund: 'Estorno',
    damage_charge: 'Cobrança Dano',
    late_fee: 'Multa Atraso',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Carregando caixa...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Receita Hoje</h3>
          <p className="text-3xl font-bold text-[var(--color-success)]">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(todayRevenue)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Cauções Hoje</h3>
          <p className="text-3xl font-bold text-[var(--color-info)]">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(todayDeposits)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Transações Hoje</h3>
          <p className="text-3xl font-bold text-[var(--color-primary)]">{todayTransactions.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-[var(--color-primary)]">Locações com Saldo Pendente</h3>
          {rentals
            .filter((r) => r.status !== 'cancelled' && r.status !== 'completed')
            .map((rental) => {
              const balance = getBalance(rental)
              const deposit = getRentalDeposit(rental.id)

              return (
                <div
                  key={rental.id}
                  onClick={() => setSelectedRental(rental)}
                  className={`bg-white rounded-xl p-6 shadow-sm border cursor-pointer transition-all ${
                    selectedRental?.id === rental.id
                      ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-[var(--color-primary)]">
                      {rental.customers?.first_name} {rental.customers?.last_name}
                    </h4>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      balance > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {balance > 0 ? 'Pendente' : 'Quitado'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{rental.products?.name}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm text-gray-500">
                      Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rental.total_price || 0)}
                    </span>
                    {balance > 0 && (
                      <span className="text-sm font-medium text-[var(--color-warning)]">
                        Saldo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}
                      </span>
                    )}
                  </div>
                  {deposit && (
                    <div className="mt-2 text-xs text-gray-500">
                      Caução: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deposit.amount)} ({deposit.status === 'held' ? 'Retida' : deposit.status})
                    </div>
                  )}
                </div>
              )
            })}
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-[var(--color-primary)]">Últimas Transações</h3>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto">
              {transactions.slice(0, 20).map((transaction) => (
                <div key={transaction.id} className="px-6 py-4 border-b border-gray-50 last:border-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        transaction.transaction_type === 'payment' ? 'bg-green-100 text-green-700' :
                        transaction.transaction_type === 'deposit' ? 'bg-blue-100 text-blue-700' :
                        transaction.transaction_type === 'refund' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {transactionTypeLabels[transaction.transaction_type]}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">
                        {paymentMethodLabels[transaction.payment_method]}
                      </span>
                    </div>
                    <span className="font-medium text-[var(--color-primary)]">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.amount)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(transaction.created_at).toLocaleString('pt-BR')}
                  </p>
                  {transaction.notes && (
                    <p className="text-xs text-gray-500 mt-1">{transaction.notes}</p>
                  )}
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="px-6 py-8 text-center text-gray-400">
                  Nenhuma transação registrada.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedRental && (
        <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-40">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <p className="font-medium text-[var(--color-primary)]">
                {selectedRental.customers?.first_name} {selectedRental.customers?.last_name} — {selectedRental.products?.name}
              </p>
              <p className="text-sm text-gray-500">
                Saldo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getBalance(selectedRental))}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPaymentForm({ ...paymentForm, amount: getBalance(selectedRental) })
                  setShowPaymentModal(true)
                }}
                className="px-6 py-2.5 bg-[var(--color-success)] text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
              >
                Registrar Pagamento
              </button>
              <button
                onClick={() => setShowDepositModal(true)}
                className="px-6 py-2.5 bg-[var(--color-info)] text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                Registrar Caução
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && selectedRental && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">Registrar Pagamento</h3>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handlePayment}
                className="flex-1 py-2.5 bg-[var(--color-success)] text-white rounded-lg hover:bg-green-600"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {showDepositModal && selectedRental && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">Registrar Caução</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                <input
                  type="number"
                  value={depositForm.amount || ''}
                  onChange={(e) => setDepositForm({ ...depositForm, amount: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
                <select
                  value={depositForm.payment_method}
                  onChange={(e) => setDepositForm({ ...depositForm, payment_method: e.target.value as PaymentMethod })}
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
                onClick={() => setShowDepositModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeposit}
                className="flex-1 py-2.5 bg-[var(--color-info)] text-white rounded-lg hover:bg-blue-600"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
