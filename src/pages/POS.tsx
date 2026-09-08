import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Product, Customer, PaymentMethod } from '../types'

const PAGE_SIZE = 20

interface CartItem {
  product: Product
  size: string
  price: number
}

interface RentalDate {
  start_date: string
  end_date: string
  status: string
}

export function POS() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const [search, setSearch] = useState('')
  const [sizeFilter, setSizeFilter] = useState('')
  const [brandFilter, setBrandFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [rentalDates, setRentalDates] = useState<RentalDate[]>([])
  const [loadingDates, setLoadingDates] = useState(false)

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)

  const [cart, setCart] = useState<CartItem[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup')

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { loadProducts() }, [])

  useEffect(() => {
    let result = products.filter((p) => p.status === 'active')
    if (search) {
      const term = search.toLowerCase()
      result = result.filter((p) =>
        p.name?.toLowerCase().includes(term) ||
        p.brand?.toLowerCase().includes(term) ||
        p.handle?.toLowerCase().includes(term)
      )
    }
    if (sizeFilter) {
      result = result.filter((p) => (p.size || '').includes(sizeFilter))
    }
    if (brandFilter) {
      result = result.filter((p) => p.brand === brandFilter)
    }
    if (categoryFilter) {
      result = result.filter((p) => p.category === categoryFilter)
    }
    setFilteredProducts(result)
    setPage(1)
    setDisplayedProducts(result.slice(0, PAGE_SIZE))
    setHasMore(result.length > PAGE_SIZE)
  }, [products, search, sizeFilter, brandFilter, categoryFilter])

  const loadMore = useCallback(() => {
    if (!hasMore) return
    const nextPage = page + 1
    const newItems = filteredProducts.slice(0, nextPage * PAGE_SIZE)
    setDisplayedProducts(newItems)
    setPage(nextPage)
    setHasMore(newItems.length < filteredProducts.length)
  }, [page, filteredProducts, hasMore])

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore() },
      { threshold: 0.1 }
    )
    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current)
    return () => observerRef.current?.disconnect()
  }, [loadMore])

  async function loadProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .order('name')
      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
    } finally {
      setLoading(false)
    }
  }

  async function selectProduct(product: Product) {
    setSelectedProduct(product)
    const sizes = (product.size || '').split(';').filter(Boolean)
    setSelectedSize(sizes[0] || '')
    setLoadingDates(true)
    try {
      const { data } = await supabase
        .from('rentals')
        .select('start_date, end_date, status')
        .eq('product_id', product.id)
        .in('status', ['active', 'confirmed', 'pending', 'pending_payment', 'preparing', 'ready_for_pickup'])
        .order('start_date')
      setRentalDates(data || [])
    } catch (error) {
      console.error('Erro ao carregar datas:', error)
      setRentalDates([])
    } finally {
      setLoadingDates(false)
    }
  }

  async function searchCustomers(term: string) {
    setCustomerSearch(term)
    if (term.length < 2) { setCustomerResults([]); return }
    const { data } = await supabase
      .from('customers')
      .select('*')
      .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`)
      .limit(8)
    setCustomerResults(data || [])
  }

  function addToCart() {
    if (!selectedProduct || !startDate || !endDate) {
      alert('Selecione as datas de início e fim.')
      return
    }
    const existing = cart.find((item) => item.product.id === selectedProduct.id && item.size === selectedSize)
    if (existing) {
      alert('Este produto já está no carrinho.')
      return
    }
    setCart([...cart, { product: selectedProduct, size: selectedSize, price: selectedProduct.price || 0 }])
    setSelectedProduct(null)
    setRentalDates([])
    setStartDate('')
    setEndDate('')
  }

  function removeFromCart(index: number) {
    setCart(cart.filter((_, i) => i !== index))
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price, 0)
  const deliveryFee = deliveryMethod === 'delivery' ? 60 : 0
  const total = subtotal + deliveryFee

  async function handleConfirmPayment() {
    if (!customer) { alert('Selecione um cliente.'); return }
    if (cart.length === 0) { alert('Adicione produtos ao carrinho.'); return }
    if (!startDate || !endDate) { alert('Selecione as datas.'); return }

    setSubmitting(true)
    try {
      for (const item of cart) {
        const { data, error } = await supabase.rpc('create_rental', {
          p_customer_id: customer.id,
          p_product_id: item.product.id,
          p_start_date: startDate,
          p_end_date: endDate,
          p_total_price: item.price,
        })
        if (error) throw error
        const result = data as any
        if (result && !result.success) {
          alert(`Conflito: ${item.product.name} não disponível neste período.`)
          setSubmitting(false)
          return
        }
      }

      alert('Locação confirmada com sucesso!')
      setCart([])
      setCustomer(null)
      setCustomerSearch('')
      setStartDate('')
      setEndDate('')
      setShowPaymentModal(false)
    } catch (error) {
      console.error('Erro ao confirmar:', error)
      alert('Erro ao confirmar locação.')
    } finally {
      setSubmitting(false)
    }
  }

  const sizes = [...new Set(products.flatMap((p) => (p.size || '').split(';')).filter(Boolean))].sort()
  const brands = [...new Set(products.map((p) => p.brand).filter(Boolean))].sort()
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))].sort()
  const productSizes = selectedProduct ? (selectedProduct.size || '').split(';').filter(Boolean) : []

  const paymentMethodLabels: Record<string, string> = {
    pix: 'PIX', credit: 'Crédito', debit: 'Débito', cash: 'Dinheiro', transfer: 'Transferência', payment_link: 'Link de Pgto',
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-400">Carregando...</div></div>
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-180px)]">
      <div className="w-1/2 flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 space-y-3">
          <input
            type="text"
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm"
          />
          <div className="flex gap-2">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]">
              <option value="">Categoria</option>
              {categories.map((c) => <option key={c} value={c!}>{c}</option>)}
            </select>
            <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]">
              <option value="">Marca</option>
              {brands.map((b) => <option key={b} value={b!}>{b}</option>)}
            </select>
            <select value={sizeFilter} onChange={(e) => setSizeFilter(e.target.value)} className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]">
              <option value="">Tamanho</option>
              {sizes.map((s) => <option key={s} value={s!}>{s}</option>)}
            </select>
          </div>
          <span className="text-xs text-gray-400">{filteredProducts.length} produtos</span>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-3 gap-3">
            {displayedProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => selectProduct(product)}
                className={`text-left rounded-lg border overflow-hidden transition-all hover:shadow-md ${
                  selectedProduct?.id === product.id
                    ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20'
                    : 'border-gray-100'
                }`}
              >
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full aspect-[3/4] object-cover" />
                ) : (
                  <div className="w-full aspect-[3/4] bg-gray-100 flex items-center justify-center text-2xl">👗</div>
                )}
                <div className="p-2">
                  {product.brand && <p className="text-[9px] font-medium text-[var(--color-accent)] uppercase truncate">{product.brand}</p>}
                  <p className="text-[11px] font-semibold text-[var(--color-primary)] line-clamp-2 leading-tight">{product.name}</p>
                  <p className="text-xs font-bold text-[var(--color-primary)] mt-1">
                    {product.price ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price) : '—'}
                  </p>
                </div>
              </button>
            ))}
          </div>
          {hasMore && <div ref={loadMoreRef} className="py-4 text-center text-xs text-gray-400">Carregando mais...</div>}
        </div>
      </div>

      <div className="w-1/2 flex flex-col gap-4">
        {selectedProduct && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-start gap-4 mb-4">
              {selectedProduct.image_url ? (
                <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-20 h-28 rounded-lg object-cover" />
              ) : (
                <div className="w-20 h-28 rounded-lg bg-gray-100 flex items-center justify-center text-3xl">👗</div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--color-primary)]">{selectedProduct.name}</h3>
                {selectedProduct.brand && <p className="text-sm text-gray-500">{selectedProduct.brand}</p>}
                {selectedProduct.price && (
                  <p className="text-lg font-bold text-[var(--color-primary)] mt-1">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedProduct.price)}
                  </p>
                )}
              </div>
              <button onClick={() => { setSelectedProduct(null); setRentalDates([]) }} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Calendário de Locações</h4>
              {loadingDates ? (
                <div className="text-xs text-gray-400 py-4 text-center">Carregando datas...</div>
              ) : (
                <MiniCalendar rentalDates={rentalDates} />
              )}
            </div>

            {rentalDates.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Períodos Ocupados</h4>
                <div className="flex flex-wrap gap-1.5">
                  {rentalDates.map((rd, i) => (
                    <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      rd.status === 'active' ? 'bg-green-100 text-green-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {rd.start_date} → {rd.end_date} {rd.status === 'active' ? '(na rua)' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex-1">
          <h3 className="font-semibold text-[var(--color-primary)] mb-4">Locação</h3>

          <div className="space-y-3 mb-4">
            <div className="relative">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Cliente</label>
              {customer ? (
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2.5">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-primary)]">{customer.first_name} {customer.last_name}</p>
                    <p className="text-xs text-gray-500">{customer.email} • {customer.phone}</p>
                  </div>
                  <button onClick={() => { setCustomer(null); setCustomerSearch('') }} className="text-xs text-red-500 hover:underline">Remover</button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar cliente..."
                    value={customerSearch}
                    onChange={(e) => { searchCustomers(e.target.value); setShowCustomerSearch(true) }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  />
                  {showCustomerSearch && customerResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {customerResults.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { setCustomer(c); setCustomerSearch(''); setShowCustomerSearch(false); setCustomerResults([]) }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                        >
                          <p className="text-sm font-medium">{c.first_name} {c.last_name}</p>
                          <p className="text-xs text-gray-500">{c.email} • {c.phone}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Data Início</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Data Fim</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
              </div>
            </div>

            {selectedProduct && productSizes.length > 0 && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Tamanho</label>
                <div className="flex gap-2">
                  {productSizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        selectedSize === s
                          ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Entrega</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeliveryMethod('pickup')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    deliveryMethod === 'pickup'
                      ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  🏪 Retirar na Loja
                </button>
                <button
                  onClick={() => setDeliveryMethod('delivery')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    deliveryMethod === 'delivery'
                      ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  🚚 Enviar
                </button>
              </div>
            </div>

            {selectedProduct && (
              <button
                onClick={addToCart}
                disabled={!startDate || !endDate}
                className="w-full py-2.5 bg-[var(--color-accent)] text-white rounded-lg font-medium hover:bg-[var(--color-accent-light)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                + Adicionar ao Carrinho
              </button>
            )}
          </div>

          {cart.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Carrinho</h4>
              <div className="space-y-2 mb-4">
                {cart.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 bg-gray-50 rounded-lg p-2.5">
                    {item.product.image_url ? (
                      <img src={item.product.image_url} alt="" className="w-8 h-10 rounded object-cover" />
                    ) : (
                      <div className="w-8 h-10 rounded bg-gray-200 flex items-center justify-center text-xs">👗</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--color-primary)] truncate">{item.product.name}</p>
                      <p className="text-[10px] text-gray-500">Tam: {item.size}</p>
                    </div>
                    <span className="text-xs font-medium text-[var(--color-primary)]">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                    </span>
                    <button onClick={() => removeFromCart(index)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                  </div>
                ))}
              </div>

              <div className="space-y-1 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal)}</span>
                </div>
                {deliveryMethod === 'delivery' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Frete</span>
                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t border-gray-100 pt-2">
                  <span>Total</span>
                  <span className="text-[var(--color-accent)]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}</span>
                </div>
              </div>

              <button
                onClick={() => setShowPaymentModal(true)}
                disabled={!customer || !startDate || !endDate}
                className="w-full py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                💳 Pagamento na Loja
              </button>
            </div>
          )}
        </div>
      </div>

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">Pagamento na Loja</h3>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Total a pagar</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
              </p>
            </div>

            <div className="space-y-2 mb-6">
              <label className="text-sm font-medium text-gray-700 block">Forma de Pagamento</label>
              {Object.entries(paymentMethodLabels).map(([value, label]) => (
                <label key={value} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  paymentMethod === value ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    value={value}
                    checked={paymentMethod === value}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-4 h-4 text-[var(--color-accent)]"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={submitting}
                className="flex-1 py-2.5 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50"
              >
                {submitting ? 'Processando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MiniCalendar({ rentalDates }: { rentalDates: RentalDate[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date().toISOString().split('T')[0]

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const dayNames = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

  function getStatus(day: number): string | null {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const match = rentalDates.find((rd) => dateStr >= rd.start_date && dateStr <= rd.end_date)
    return match?.status || null
  }

  const days = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50">
        <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="text-gray-400 hover:text-gray-600 text-sm">‹</button>
        <span className="text-xs font-semibold text-[var(--color-primary)]">{monthNames[month]} {year}</span>
        <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="text-gray-400 hover:text-gray-600 text-sm">›</button>
      </div>
      <div className="grid grid-cols-7 gap-px p-1">
        {dayNames.map((d, i) => (
          <div key={i} className="text-center text-[9px] font-medium text-gray-400 py-1">{d}</div>
        ))}
        {days.map((day, i) => {
          if (!day) return <div key={i} />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const status = getStatus(day)
          const isToday = dateStr === today
          const isPast = dateStr < today

          return (
            <div
              key={i}
              className={`text-center text-[10px] py-1 rounded ${
                status === 'active'
                  ? 'bg-green-200 text-green-800 font-medium'
                  : status
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : isToday
                  ? 'bg-[var(--color-accent)] text-white font-bold'
                  : isPast
                  ? 'text-gray-300'
                  : 'text-gray-600'
              }`}
              title={status ? `Ocupado (${status})` : 'Disponível'}
            >
              {day}
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 border-t border-gray-200">
        <span className="flex items-center gap-1 text-[9px] text-gray-500"><span className="w-2.5 h-2.5 rounded bg-green-200" /> Na rua</span>
        <span className="flex items-center gap-1 text-[9px] text-gray-500"><span className="w-2.5 h-2.5 rounded bg-blue-100" /> Reservado</span>
        <span className="flex items-center gap-1 text-[9px] text-gray-500"><span className="w-2.5 h-2.5 rounded bg-[var(--color-accent)]" /> Hoje</span>
      </div>
    </div>
  )
}
