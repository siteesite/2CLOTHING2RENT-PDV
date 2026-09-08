import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Product, Customer, PaymentMethod } from '../types'

const PAGE_SIZE = 20

interface CartItem {
  product: Product
  size: string
  price: number
  periodDays: number
}

interface RentalDate {
  start_date: string
  end_date: string
  status: string
}

interface Settings {
  rental_min_days: number
  rental_max_days: number
  rental_buffer_days: number
  rental_periods: { days: number; type: string; label: string; value: number }[]
  shipping_north: number
  shipping_northeast: number
  shipping_central_west: number
  shipping_southeast: number
  shipping_south: number
  delivery_north: number
  delivery_northeast: number
  delivery_central_west: number
  delivery_southeast: number
  delivery_south: number
  shipping_active_north: boolean
  shipping_active_northeast: boolean
  shipping_active_central_west: boolean
  shipping_active_southeast: boolean
  shipping_active_south: boolean
}

const shippingRegions = [
  { key: 'southeast', label: 'Sudeste' },
  { key: 'south', label: 'Sul' },
  { key: 'central_west', label: 'Centro-Oeste' },
  { key: 'northeast', label: 'Nordeste' },
  { key: 'north', label: 'Norte' },
]

export function POS() {
  const [settings, setSettings] = useState<Settings | null>(null)
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
  const [selectedPeriod, setSelectedPeriod] = useState(3)
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup')
  const [shippingRegion, setShippingRegion] = useState('')

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix')
  const [submitting, setSubmitting] = useState(false)
  const [showAsaasLinkModal, setShowAsaasLinkModal] = useState(false)
  const [asaasLink, setAsaasLink] = useState('')
  const [generatingLink, setGeneratingLink] = useState(false)
  const [asaasBillingType, setAsaasBillingType] = useState<'PIX' | 'CREDIT_CARD'>('PIX')

  useEffect(() => {
    loadSettings()
    loadProducts()
  }, [])

  async function loadSettings() {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .single()
      if (error) throw error
      setSettings(data)
      setSelectedPeriod(data.rental_min_days || 3)
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    }
  }

  useEffect(() => {
    if (!settings) return
    if (selectedPeriod >= settings.rental_min_days && startDate) {
      const start = new Date(startDate)
      const end = new Date(start)
      end.setDate(end.getDate() + selectedPeriod)
      setEndDate(end.toISOString().split('T')[0])
    }
  }, [selectedPeriod, startDate, settings])

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
    if (sizeFilter) result = result.filter((p) => (p.size || '').includes(sizeFilter))
    if (brandFilter) result = result.filter((p) => p.brand === brandFilter)
    if (categoryFilter) result = result.filter((p) => p.category === categoryFilter)
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
      const { data, error } = await supabase.from('products').select('*').eq('status', 'active').order('name')
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
      setRentalDates([])
    } finally {
      setLoadingDates(false)
    }
  }

  function isDateAvailable(date: string): boolean {
    if (!settings) return true
    const buffer = settings.rental_buffer_days
    return !rentalDates.some((rd) => {
      const rdStart = new Date(rd.start_date)
      const rdEnd = new Date(rd.end_date)
      rdStart.setDate(rdStart.getDate() - buffer)
      rdEnd.setDate(rdEnd.getDate() + buffer)
      const d = new Date(date)
      return d >= rdStart && d <= rdEnd
    })
  }

  function checkPeriodAvailability(start: string, days: number): boolean {
    if (!settings) return true
    const startDate = new Date(start)
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate)
      d.setDate(d.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      if (!isDateAvailable(dateStr)) return false
    }
    return true
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

  function calculatePrice(basePrice: number, days: number): number {
    if (!settings) return basePrice
    const period = settings.rental_periods.find((p) => p.days === days)
    if (!period) return basePrice
    if (period.type === 'fixed') return basePrice + period.value
    if (period.type === 'percentage') return basePrice * (1 + period.value / 100)
    return basePrice
  }

  function getShippingFee(): number {
    if (!settings || !shippingRegion) return 0
    const key = `shipping_${shippingRegion}` as keyof Settings
    return (settings[key] as number) || 0
  }

  function isRegionActive(region: string): boolean {
    if (!settings) return false
    const key = `shipping_active_${region}` as keyof Settings
    return (settings[key] as boolean) || false
  }

  function addToCart() {
    if (!selectedProduct || !startDate || !endDate) {
      alert('Selecione as datas.')
      return
    }
    if (settings && selectedPeriod < settings.rental_min_days) {
      alert(`O período mínimo de locação é ${settings.rental_min_days} dias.`)
      return
    }
    if (!checkPeriodAvailability(startDate, selectedPeriod)) {
      alert('Este produto não está disponível no período selecionado. Verifique o calendário.')
      return
    }
    const existing = cart.find((item) => item.product.id === selectedProduct.id)
    if (existing) {
      alert('Este produto já está no carrinho.')
      return
    }
    const price = calculatePrice(selectedProduct.price || 0, selectedPeriod)
    setCart([...cart, { product: selectedProduct, size: selectedSize, price, periodDays: selectedPeriod }])
    setSelectedProduct(null)
    setRentalDates([])
    setStartDate('')
    setEndDate('')
  }

  function removeFromCart(index: number) {
    setCart(cart.filter((_, i) => i !== index))
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price, 0)
  const shippingFee = deliveryMethod === 'delivery' ? getShippingFee() : 0
  const total = subtotal + shippingFee

  async function handleConfirmPayment() {
    if (!customer) { alert('Selecione um cliente.'); return }
    if (cart.length === 0) { alert('Adicione produtos ao carrinho.'); return }
    if (!startDate || !endDate) { alert('Selecione as datas.'); return }
    if (deliveryMethod === 'delivery' && !shippingRegion) { alert('Selecione a região de entrega.'); return }

    for (const item of cart) {
      if (!checkPeriodAvailability(item.product.id, item.periodDays)) {
        alert(`Conflito: ${item.product.name} não está disponível no período selecionado.`)
        return
      }
    }

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
          alert(`Conflito: ${item.product.name} não disponível.`)
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
      setShippingRegion('')
      setShowPaymentModal(false)
    } catch (error) {
      console.error('Erro ao confirmar:', error)
      alert('Erro ao confirmar locação.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGenerateAsaasLink() {
    if (!customer) { alert('Selecione um cliente.'); return }
    if (cart.length === 0) { alert('Adicione produtos ao carrinho.'); return }

    setGeneratingLink(true)
    setAsaasLink('')
    try {
      const productNames = cart.map((item) => item.product.name).join(', ')
      const description = `Locação: ${productNames}`

      const { data, error } = await supabase.functions.invoke('asaas-payment-link', {
        body: {
          amount: total,
          customer_name: `${customer.first_name} ${customer.last_name}`,
          customer_email: customer.email,
          customer_cpf: (customer as any).cpf || '',
          description,
          billing_type: asaasBillingType,
        },
      })

      if (error) throw error
      if (!data.success) throw new Error(data.error)

      setAsaasLink(data.invoice_url)
      setShowPaymentModal(false)
      setShowAsaasLinkModal(true)
    } catch (error: any) {
      console.error('Erro ao gerar link:', error)
      alert(error.message || 'Erro ao gerar link de pagamento.')
    } finally {
      setGeneratingLink(false)
    }
  }

  async function handleConfirmAsaasLink() {
    if (!customer) return

    setSubmitting(true)
    try {
      for (const item of cart) {
        const { error } = await supabase.rpc('create_rental', {
          p_customer_id: customer.id,
          p_product_id: item.product.id,
          p_start_date: startDate,
          p_end_date: endDate,
          p_total_price: item.price,
        })
        if (error) throw error
      }

      if (asaasLink) {
        await supabase.from('orders').insert({
          order_name: `PDV-${Date.now()}`,
          email: customer.email,
          financial_status: 'pending',
          total_price: total,
          subtotal,
          shipping: shippingFee,
          currency: 'BRL',
          line_items: cart.map((item) => ({
            name: item.product.name,
            size: item.size,
            price: item.price,
            period: `${item.periodDays} dias`,
          })),
        })
      }

      alert('Locação criada! O link de pagamento foi enviado ao cliente.')
      setCart([])
      setCustomer(null)
      setCustomerSearch('')
      setStartDate('')
      setEndDate('')
      setShippingRegion('')
      setShowAsaasLinkModal(false)
      setAsaasLink('')
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao criar locação.')
    } finally {
      setSubmitting(false)
    }
  }

  const sizes = [...new Set(products.flatMap((p) => (p.size || '').split(';').filter(Boolean)))].sort()
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
                <MiniCalendar rentalDates={rentalDates} bufferDays={settings?.rental_buffer_days || 3} />
              )}
            </div>

            {rentalDates.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Períodos Ocupados</h4>
                <div className="flex flex-wrap gap-1.5">
                  {rentalDates.map((rd, i) => (
                    <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      rd.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {rd.start_date} → {rd.end_date} {rd.status === 'active' ? '(na rua)' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex-1 overflow-y-auto">
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

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Período de Locação</label>
              <div className="flex flex-wrap gap-2">
                {settings?.rental_periods.map((period) => (
                  <button
                    key={period.days}
                    onClick={() => setSelectedPeriod(period.days)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      selectedPeriod === period.days
                        ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Data Início</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Data Fim</label>
                <input type="date" value={endDate} readOnly
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500" />
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

            {deliveryMethod === 'delivery' && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Região de Entrega</label>
                <select
                  value={shippingRegion}
                  onChange={(e) => setShippingRegion(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                >
                  <option value="">Selecione a região</option>
                  {shippingRegions
                    .filter((r) => isRegionActive(r.key))
                    .map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.label} — {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((settings?.[`shipping_${r.key}` as keyof Settings] as number) || 0)} ({settings?.[`delivery_${r.key}` as keyof Settings] as number} dias)
                      </option>
                    ))}
                </select>
              </div>
            )}

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
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Carrinho</h4>
                <span className="text-xs text-gray-400">{cart.length} {cart.length === 1 ? 'item' : 'itens'}</span>
              </div>
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                {cart.map((item, index) => {
                  const productSizes = (item.product.size || '').split(';').filter(Boolean)
                  return (
                    <div key={index} className="bg-gray-50 rounded-lg p-2.5">
                      <div className="flex items-center gap-3">
                        {item.product.image_url ? (
                          <img src={item.product.image_url} alt="" className="w-8 h-10 rounded object-cover" />
                        ) : (
                          <div className="w-8 h-10 rounded bg-gray-200 flex items-center justify-center text-xs">👗</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[var(--color-primary)] truncate">{item.product.name}</p>
                          {item.product.brand && <p className="text-[9px] text-gray-400 uppercase">{item.product.brand}</p>}
                          <div className="flex items-center gap-2 mt-1">
                            {productSizes.length > 1 ? (
                              <select
                                value={item.size}
                                onChange={(e) => {
                                  const newCart = [...cart]
                                  newCart[index] = { ...item, size: e.target.value }
                                  setCart(newCart)
                                }}
                                className="text-[10px] px-1.5 py-0.5 border border-gray-200 rounded bg-white"
                              >
                                {productSizes.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                            ) : (
                              <span className="text-[10px] text-gray-500">Tam: {item.size}</span>
                            )}
                            <span className="text-[10px] text-gray-400">• {item.periodDays} dias</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xs font-medium text-[var(--color-primary)] block">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                          </span>
                          <button onClick={() => removeFromCart(index)} className="text-[10px] text-red-400 hover:text-red-600 mt-1">remover</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="space-y-1 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal)}</span>
                </div>
                {deliveryMethod === 'delivery' && shippingRegion && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Frete ({shippingRegions.find((r) => r.key === shippingRegion)?.label})</span>
                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(shippingFee)}</span>
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
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">Pagamento</h3>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Total a pagar</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
              </p>
            </div>

            <div className="space-y-2 mb-4">
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

            <div className="border-t border-gray-100 pt-4 mb-4">
              <label className="text-xs font-medium text-gray-500 mb-2 block">Link Asaas - Forma de pagamento</label>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setAsaasBillingType('PIX')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    asaasBillingType === 'PIX'
                      ? 'bg-green-500 text-white border-green-500'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  PIX
                </button>
                <button
                  onClick={() => setAsaasBillingType('CREDIT_CARD')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    asaasBillingType === 'CREDIT_CARD'
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  Cartão de Crédito
                </button>
              </div>
              <button
                onClick={handleGenerateAsaasLink}
                disabled={generatingLink}
                className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {generatingLink ? (
                  'Gerando link...'
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Gerar Link Asaas
                  </>
                )}
              </button>
              <p className="text-xs text-gray-400 text-center mt-2">
                Gera um link para o cliente pagar online via {asaasBillingType === 'PIX' ? 'PIX' : 'Cartão de Crédito'}
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowPaymentModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleConfirmPayment} disabled={submitting} className="flex-1 py-2.5 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50">
                {submitting ? 'Processando...' : 'Confirmar na Loja'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAsaasLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">Link de Pagamento Asaas</h3>

            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-700 font-medium">Link gerado com sucesso!</p>
              <p className="text-xs text-green-600 mt-1">Copie e envie para o cliente via WhatsApp.</p>
            </div>

            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Link de Pagamento</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={asaasLink}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(asaasLink)
                    alert('Link copiado!')
                  }}
                  className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-accent-light)]"
                >
                  Copiar
                </button>
              </div>
            </div>

            {customer?.phone && (
              <a
                href={`https://wa.me/55${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Aqui está o link para pagamento da sua locação: ${asaasLink}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2 mb-4"
              >
                Enviar via WhatsApp
              </a>
            )}

            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 mb-4">
              <p className="text-xs text-yellow-700">
                <strong>Importante:</strong> Após o cliente pagar, o status será atualizado automaticamente via webhook.
                A reserva ficará com pagamento pendente até a confirmação.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowAsaasLinkModal(false); setAsaasLink('') }}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Fechar
              </button>
              <button
                onClick={handleConfirmAsaasLink}
                disabled={submitting}
                className="flex-1 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50"
              >
                {submitting ? 'Processando...' : 'Confirmar Reserva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MiniCalendar({ rentalDates, bufferDays }: { rentalDates: RentalDate[]; bufferDays: number }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date().toISOString().split('T')[0]

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const dayNames = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

  function getDayInfo(day: number): { status: string | null; buffered: boolean } {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const match = rentalDates.find((rd) => dateStr >= rd.start_date && dateStr <= rd.end_date)
    if (match) return { status: match.status, buffered: false }

    const buffered = rentalDates.some((rd) => {
      const rdStart = new Date(rd.start_date)
      const rdEnd = new Date(rd.end_date)
      rdStart.setDate(rdStart.getDate() - bufferDays)
      rdEnd.setDate(rdEnd.getDate() + bufferDays)
      const d = new Date(dateStr)
      return d >= rdStart && d <= rdEnd
    })

    return { status: null, buffered }
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
          const { status, buffered } = getDayInfo(day)
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
                  : buffered
                  ? 'bg-amber-50 text-amber-400'
                  : isToday
                  ? 'bg-[var(--color-accent)] text-white font-bold'
                  : isPast
                  ? 'text-gray-300'
                  : 'text-gray-600'
              }`}
              title={
                status === 'active' ? 'Na rua' :
                status ? 'Reservado' :
                buffered ? `Buffer (${bufferDays} dias)` :
                'Disponível'
              }
            >
              {day}
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 border-t border-gray-200">
        <span className="flex items-center gap-1 text-[9px] text-gray-500"><span className="w-2.5 h-2.5 rounded bg-green-200" /> Na rua</span>
        <span className="flex items-center gap-1 text-[9px] text-gray-500"><span className="w-2.5 h-2.5 rounded bg-blue-100" /> Reservado</span>
        <span className="flex items-center gap-1 text-[9px] text-gray-500"><span className="w-2.5 h-2.5 rounded bg-amber-50" /> Buffer</span>
        <span className="flex items-center gap-1 text-[9px] text-gray-500"><span className="w-2.5 h-2.5 rounded bg-[var(--color-accent)]" /> Hoje</span>
      </div>
    </div>
  )
}
