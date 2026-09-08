import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Product, Customer, CartItem } from '../types'

export function POS() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [productResults, setProductResults] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [discount, setDiscount] = useState(0)
  const [_discountReason, setDiscountReason] = useState('')

  async function searchCustomers(term: string) {
    setCustomerSearch(term)
    if (term.length < 2) {
      setCustomerResults([])
      return
    }
    const { data } = await supabase
      .from('customers')
      .select('*')
      .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`)
      .limit(10)
    setCustomerResults(data || [])
  }

  async function searchProducts(term: string) {
    setProductSearch(term)
    if (term.length < 2) {
      setProductResults([])
      return
    }
    const { data } = await supabase
      .from('products')
      .select('*')
      .or(`name.ilike.%${term}%,brand.ilike.%${term}%,handle.ilike.%${term}%`)
      .eq('status', 'active')
      .limit(10)
    setProductResults(data || [])
  }

  function addToCart(product: Product) {
    if (!startDate || !endDate) {
      alert('Selecione as datas de início e fim primeiro.')
      return
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

    if (days < 1) {
      alert('A data de fim deve ser posterior à data de início.')
      return
    }

    const existing = cart.find((item) => item.product.id === product.id)
    if (existing) {
      alert('Este produto já está no carrinho.')
      return
    }

    const price = product.price || 0

    setCart([...cart, {
      product,
      start_date: startDate,
      end_date: endDate,
      days,
      price,
    }])

    setProductSearch('')
    setProductResults([])
  }

  function removeFromCart(productId: string) {
    setCart(cart.filter((item) => item.product.id !== productId))
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price, 0)
  const total = subtotal - discount

  async function handleConfirm() {
    if (!customer) {
      alert('Selecione um cliente.')
      return
    }
    if (cart.length === 0) {
      alert('Adicione pelo menos um produto ao carrinho.')
      return
    }

    try {
      for (const item of cart) {
        const { error } = await supabase.from('rentals').insert({
          customer_id: customer.id,
          product_id: item.product.id,
          start_date: item.start_date,
          end_date: item.end_date,
          status: 'confirmed',
          total_price: item.price,
        })
        if (error) throw error
      }

      alert('Locação confirmada com sucesso!')
      setCart([])
      setCustomer(null)
      setCustomerSearch('')
      setDiscount(0)
      setDiscountReason('')
    } catch (error) {
      console.error('Erro ao confirmar locação:', error)
      alert('Erro ao confirmar locação. Verifique o console.')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-[var(--color-primary)] mb-4">Cliente</h3>
          {customer ? (
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
              <div>
                <p className="font-medium text-[var(--color-primary)]">
                  {customer.first_name} {customer.last_name}
                </p>
                <p className="text-sm text-gray-500">{customer.email} • {customer.phone}</p>
              </div>
              <button
                onClick={() => { setCustomer(null); setCustomerSearch('') }}
                className="text-sm text-[var(--color-danger)] hover:underline"
              >
                Remover
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar cliente por nome, e-mail ou telefone..."
                value={customerSearch}
                onChange={(e) => searchCustomers(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
              />
              {customerResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {customerResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setCustomer(c); setCustomerSearch(''); setCustomerResults([]) }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      <p className="font-medium text-sm">{c.first_name} {c.last_name}</p>
                      <p className="text-xs text-gray-500">{c.email} • {c.phone}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-[var(--color-primary)] mb-4">Período da Locação</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-[var(--color-primary)] mb-4">Produtos</h3>
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar produto por nome, marca ou código..."
              value={productSearch}
              onChange={(e) => searchProducts(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
            />
            {productResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {productResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-center gap-3"
                  >
                    {p.principal_image_url ? (
                      <img src={p.principal_image_url} alt={p.name} className="w-10 h-10 rounded object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-lg">👗</div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.brand} • {p.price ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price) : '—'}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 sticky top-24">
          <h3 className="font-semibold text-[var(--color-primary)] mb-4">Carrinho</h3>

          {cart.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nenhum produto adicionado.</p>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.product.id} className="flex items-start justify-between bg-gray-50 rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-primary)] truncate">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.start_date} → {item.end_date} ({item.days} dias)
                    </p>
                    <p className="text-sm font-semibold text-[var(--color-primary)] mt-1">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-[var(--color-danger)] hover:bg-red-50 rounded p-1 ml-2"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-gray-100 mt-4 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Desconto</span>
              <input
                type="number"
                value={discount || ''}
                onChange={(e) => setDiscount(Number(e.target.value))}
                placeholder="0,00"
                className="w-24 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              />
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-[var(--color-accent)]">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
              </span>
            </div>
          </div>

          <button
            onClick={handleConfirm}
            disabled={!customer || cart.length === 0}
            className="w-full mt-6 py-3 bg-[var(--color-accent)] text-white rounded-lg font-semibold hover:bg-[var(--color-accent-light)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirmar Locação
          </button>
        </div>
      </div>
    </div>
  )
}
