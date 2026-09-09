import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Product, Customer, PaymentMethod } from '../types'

const PAGE_SIZE = 20

interface CartItem {
  product: Product
  size: string
  price: number
  startDate: string
  endDate: string
  days: number
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
  preparation_days: number
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
  const [selectedSize, setSelectedSize] = useState('')

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)

  const [cart, setCart] = useState<CartItem[]>([])
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup')
  const [shippingRegion, setShippingRegion] = useState('')

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix')
  const [submitting, setSubmitting] = useState(false)
  const [showAsaasLinkModal, setShowAsaasLinkModal] = useState(false)
  const [asaasLink, setAsaasLink] = useState('')
  const [generatingLink, setGeneratingLink] = useState(false)
  const [asaasBillingType, setAsaasBillingType] = useState<'PIX' | 'CREDIT_CARD'>('PIX')
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null)
  const [couponError, setCouponError] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)

  // Calendar state
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [selectingEnd, setSelectingEnd] = useState(false)
  const [tempStart, setTempStart] = useState('')
  const [tempEnd, setTempEnd] = useState('')
  const [hoverDate, setHoverDate] = useState('')

  useEffect(() => {
    loadSettings()
    loadProducts()
  }, [])

  async function loadSettings() {
    try {
      const { data } = await supabase
        .from('settings')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .single()
      if (data) setSettings(data)
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    }
  }

  async function loadProducts() {
    try {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .order('name')
      setProducts(data || [])
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
    } finally {
      setLoading(false)
    }
  }

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

  async function selectProduct(product: Product) {
    setSelectedProduct(product)
    const sizes = (product.size || '').split(';').filter(Boolean)
    setSelectedSize(sizes[0] || '')
    setTempStart('')
    setTempEnd('')
    setSelectingEnd(false)
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

  // Calendar helpers
  function getDateStr(day: number) {
    return `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function isOccupied(dateStr: string): boolean {
    const buffer = settings?.rental_buffer_days || 3
    return rentalDates.some((rd) => {
      const start = new Date(rd.start_date + 'T00:00:00')
      const end = new Date(rd.end_date + 'T00:00:00')
      start.setDate(start.getDate() - buffer)
      end.setDate(end.getDate() + buffer)
      const d = new Date(dateStr + 'T00:00:00')
      return d >= start && d <= end
    })
  }

  function isInRange(dateStr: string): boolean {
    if (!tempStart) return false
    const end = tempEnd || hoverDate
    if (!end) return dateStr === tempStart
    const min = tempStart < end ? tempStart : end
    const max = tempStart < end ? end : tempStart
    return dateStr >= min && dateStr <= max
  }

  function handleDayClick(day: number) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dateStr = getDateStr(day)
    if (new Date(dateStr + 'T00:00:00') < today) return
    if (isOccupied(dateStr)) return

    if (!selectingEnd) {
      setTempStart(dateStr)
      setTempEnd('')
      setSelectingEnd(true)
    } else {
      let start = tempStart
      let end = dateStr
      if (end < start) { start = dateStr; end = tempStart }

      // Validate min days
      const days = Math.ceil((new Date(end + 'T00:00:00').getTime() - new Date(start + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)) + 1
      const minDays = settings?.rental_min_days || 3
      if (days < minDays) {
        alert(`Período mínimo: ${minDays} dias`)
        return
      }

      // Validate conflict
      for (const rd of rentalDates) {
        const rdStart = new Date(rd.start_date + 'T00:00:00')
        const rdEnd = new Date(rd.end_date + 'T00:00:00')
        const buffer = settings?.rental_buffer_days || 3
        rdStart.setDate(rdStart.getDate() - buffer)
        rdEnd.setDate(rdEnd.getDate() + buffer)
        const selStart = new Date(start + 'T00:00:00')
        const selEnd = new Date(end + 'T00:00:00')
        if (selStart <= rdEnd && selEnd >= rdStart) {
          alert('Conflito com locação existente.')
          return
        }
      }

      setTempStart(start)
      setTempEnd(end)
      setSelectingEnd(false)
    }
  }

  function addToCart() {
    if (!selectedProduct || !tempStart || !tempEnd) {
      alert('Selecione o período no calendário.')
      return
    }

    const existing = cart.find((item) => item.product.id === selectedProduct.id)
    if (existing) {
      alert('Produto já está no carrinho.')
      return
    }

    const days = Math.ceil((new Date(tempEnd + 'T00:00:00').getTime() - new Date(tempStart + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)) + 1
    const price = calculatePrice(selectedProduct.price || 0, days)

    setCart([...cart, {
      product: selectedProduct,
      size: selectedSize,
      price,
      startDate: tempStart,
      endDate: tempEnd,
      days,
    }])

    setSelectedProduct(null)
    setRentalDates([])
    setTempStart('')
    setTempEnd('')
    setSelectingEnd(false)
  }

  function removeFromCart(index: number) {
    setCart(cart.filter((_, i) => i !== index))
  }

  function calculatePrice(basePrice: number, days: number): number {
    if (!settings) return basePrice
    const rules = [...(settings.rental_periods || [])].sort((a, b) => b.days - a.days)
    const rule = rules.find((r) => days >= r.days)
    if (!rule) return basePrice
    if (rule.type === 'fixed') return basePrice + rule.value
    if (rule.type === 'percentage') return basePrice * (1 + rule.value / 100)
    return basePrice
  }

  async function applyCoupon() {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    setCouponError('')
    setAppliedCoupon(null)

    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase().trim())
        .eq('is_active', true)
        .single()

      if (error || !data) {
        setCouponError('Cupom inválido ou inativo.')
        return
      }

      const now = new Date()
      if (data.valid_from && new Date(data.valid_from) > now) {
        setCouponError('Cupom ainda não está válido.')
        return
      }
      if (data.valid_until && new Date(data.valid_until) < now) {
        setCouponError('Cupom expirado.')
        return
      }

      const sub = cart.reduce((sum, item) => sum + item.price, 0)
      if (data.min_order_value && sub < data.min_order_value) {
        setCouponError(`Valor mínimo: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.min_order_value)}`)
        return
      }

      setAppliedCoupon(data)
    } catch (error) {
      setCouponError('Erro ao validar cupom.')
    } finally {
      setCouponLoading(false)
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null)
    setCouponCode('')
    setCouponError('')
  }

  function calculateDiscount(): number {
    if (!appliedCoupon) return 0
    const sub = cart.reduce((sum, item) => sum + item.price, 0)
    if (appliedCoupon.discount_type === 'percentage') return sub * (appliedCoupon.discount_value / 100)
    if (appliedCoupon.discount_type === 'fixed') return appliedCoupon.discount_value
    return 0
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

  const subtotal = cart.reduce((sum, item) => sum + item.price, 0)
  const shippingFee = deliveryMethod === 'delivery' ? getShippingFee() : 0
  const discount = calculateDiscount()
  const total = subtotal + shippingFee - discount

  async function handleConfirmPayment() {
    if (!customer) { alert('Selecione um cliente.'); return }
    if (cart.length === 0) { alert('Adicione produtos.'); return }

    setSubmitting(true)
    try {
      const orderName = `PDV-${Date.now()}`

      for (const item of cart) {
        const { error } = await supabase.from('rentals').insert({
          product_id: item.product.id,
          user_id: customer.id,
          start_date: item.startDate,
          end_date: item.endDate,
          status: 'confirmed',
          total_price: item.price,
          order_name: orderName,
        })
        if (error) throw error
      }

      alert('Locação confirmada!')
      setCart([])
      setCustomer(null)
      setCustomerSearch('')
      setShowPaymentModal(false)
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao confirmar locação.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGenerateAsaasLink() {
    if (!customer) { alert('Selecione um cliente.'); return }
    if (cart.length === 0) { alert('Adicione produtos.'); return }

    setGeneratingLink(true)
    setAsaasLink('')
    try {
      const productNames = cart.map((item) => item.product.name).join(', ')
      const { data, error } = await supabase.functions.invoke('asaas-payment-link', {
        body: {
          amount: total,
          customer_name: `${customer.first_name} ${customer.last_name}`,
          customer_email: customer.email,
          customer_cpf: (customer as any).cpf || '',
          description: `Locação: ${productNames}`,
          billing_type: asaasBillingType,
        },
      })

      if (error) throw error
      if (!data.success) throw new Error(data.error)

      setAsaasLink(data.invoice_url)
      setShowPaymentModal(false)
      setShowAsaasLinkModal(true)
    } catch (error: any) {
      alert(error.message || 'Erro ao gerar link.')
    } finally {
      setGeneratingLink(false)
    }
  }

  async function handleConfirmAsaasLink() {
    if (!customer) return

    setSubmitting(true)
    try {
      const orderName = `PDV-${Date.now()}`

      for (const item of cart) {
        const { error } = await supabase.from('rentals').insert({
          product_id: item.product.id,
          user_id: customer.id,
          start_date: item.startDate,
          end_date: item.endDate,
          status: 'pending',
          total_price: item.price,
          order_name: orderName,
        })
        if (error) throw error
      }

      alert('Reserva criada! Link enviado ao cliente.')
      setCart([])
      setCustomer(null)
      setCustomerSearch('')
      setShowAsaasLinkModal(false)
      setAsaasLink('')
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao criar reserva.')
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

  // Calendar render
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const firstDay = new Date(calYear, calMonth, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const calDays: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) calDays.push(null)
  for (let i = 1; i <= daysInMonth; i++) calDays.push(i)

  const selectedDays = tempStart && tempEnd
    ? Math.ceil((new Date(tempEnd + 'T00:00:00').getTime() - new Date(tempStart + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-400">Carregando...</div></div>
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-180px)]">
      {/* Left: Products */}
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
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs">
              <option value="">Categoria</option>
              {categories.map((c) => <option key={c} value={c!}>{c}</option>)}
            </select>
            <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs">
              <option value="">Marca</option>
              {brands.map((b) => <option key={b} value={b!}>{b}</option>)}
            </select>
            <select value={sizeFilter} onChange={(e) => setSizeFilter(e.target.value)} className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs">
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

      {/* Right: Rental form */}
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
              <button onClick={() => { setSelectedProduct(null); setRentalDates([]); setTempStart(''); setTempEnd('') }} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {/* Calendar */}
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                Selecione o período {tempStart && !tempEnd ? '(clique na data de devolução)' : tempStart && tempEnd ? `(${selectedDays} dias)` : '(clique na data de retirada)'}
              </h4>
              {loadingDates ? (
                <div className="text-xs text-gray-400 py-4 text-center">Carregando...</div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden select-none">
                  <div className="flex items-center justify-between px-4 py-3 bg-[var(--color-primary)]">
                    <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1) } else setCalMonth(calMonth - 1) }} className="w-8 h-8 flex items-center justify-center rounded-full text-white hover:bg-white/20 text-lg font-bold">‹</button>
                    <span className="text-sm font-semibold text-white">{monthNames[calMonth]} {calYear}</span>
                    <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1) } else setCalMonth(calMonth + 1) }} className="w-8 h-8 flex items-center justify-center rounded-full text-white hover:bg-white/20 text-lg font-bold">›</button>
                  </div>
                  <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
                    {dayNames.map((d, i) => <div key={i} className="text-center text-[10px] font-semibold text-gray-500 py-2">{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-px p-2 bg-white">
                    {calDays.map((day, i) => {
                      if (!day) return <div key={i} className="h-8" />
                      const dateStr = getDateStr(day)
                      const d = new Date(dateStr + 'T00:00:00')
                      const isPast = d < today
                      const occupied = isOccupied(dateStr)
                      const isStart = dateStr === tempStart
                      const isEnd = dateStr === tempEnd
                      const inRange = isInRange(dateStr)
                      const clickable = !isPast && !occupied

                      let bg = 'bg-white border-gray-100'
                      let txt = 'text-gray-700'
                      if (occupied) { bg = 'bg-red-100 border-red-200'; txt = 'text-red-700 font-semibold' }
                      else if (isStart || isEnd) { bg = 'bg-[var(--color-accent)] border-[var(--color-accent)]'; txt = 'text-white font-bold' }
                      else if (inRange) { bg = 'bg-pink-50 border-pink-200'; txt = 'text-pink-700' }
                      else if (isPast) { bg = 'bg-gray-50'; txt = 'text-gray-300' }

                      return (
                        <div
                          key={i}
                          onClick={() => clickable && handleDayClick(day)}
                          onMouseEnter={() => { if (clickable && selectingEnd) setHoverDate(dateStr) }}
                          className={`h-8 flex items-center justify-center text-xs rounded border transition-colors ${bg} ${txt} ${clickable ? 'cursor-pointer hover:bg-green-50 hover:border-green-300' : 'cursor-default'}`}
                        >
                          {day}
                        </div>
                      )
                    })}
                  </div>
                  {tempStart && tempEnd && (
                    <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
                      {tempStart} → {tempEnd} ({selectedDays} dias)
                      {selectedProduct.price && (
                        <span className="ml-2 font-semibold text-[var(--color-primary)]">
                          = {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculatePrice(selectedProduct.price, selectedDays))}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3 px-3 py-2 bg-gray-50 border-t border-gray-200">
                    <span className="flex items-center gap-1 text-[10px] text-gray-600"><span className="w-3 h-3 rounded border bg-red-100 border-red-200" /> Ocupado</span>
                    <span className="flex items-center gap-1 text-[10px] text-gray-600"><span className="w-3 h-3 rounded border bg-[var(--color-accent)]" /> Selecionado</span>
                    <span className="flex items-center gap-1 text-[10px] text-gray-600"><span className="w-3 h-3 rounded border bg-pink-50 border-pink-200" /> Período</span>
                  </div>
                </div>
              )}
            </div>

            {/* Size */}
            {productSizes.length > 0 && (
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Tamanho</label>
                <div className="flex gap-2">
                  {productSizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        selectedSize === s ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={addToCart}
              disabled={!tempStart || !tempEnd}
              className="w-full py-2.5 bg-[var(--color-accent)] text-white rounded-lg font-medium hover:bg-[var(--color-accent-light)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              + Adicionar ao Carrinho
            </button>
          </div>
        )}

        {/* Cart & payment */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex-1 overflow-y-auto">
          <h3 className="font-semibold text-[var(--color-primary)] mb-4">Locação</h3>

          <div className="space-y-3 mb-4">
            {/* Customer */}
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
                  <input type="text" placeholder="Buscar cliente..." value={customerSearch} onChange={(e) => { searchCustomers(e.target.value); setShowCustomerSearch(true) }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
                  {showCustomerSearch && customerResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {customerResults.map((c) => (
                        <button key={c.id} onClick={() => { setCustomer(c); setCustomerSearch(''); setShowCustomerSearch(false); setCustomerResults([]) }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                          <p className="text-sm font-medium">{c.first_name} {c.last_name}</p>
                          <p className="text-xs text-gray-500">{c.email} • {c.phone}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Delivery */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Entrega</label>
              <div className="flex gap-2">
                <button onClick={() => setDeliveryMethod('pickup')} className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${deliveryMethod === 'pickup' ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]' : 'border-gray-200 text-gray-600'}`}>
                  🏪 Retirar na Loja
                </button>
                <button onClick={() => setDeliveryMethod('delivery')} className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${deliveryMethod === 'delivery' ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]' : 'border-gray-200 text-gray-600'}`}>
                  🚚 Enviar
                </button>
              </div>
            </div>

            {deliveryMethod === 'delivery' && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Região</label>
                <select value={shippingRegion} onChange={(e) => setShippingRegion(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="">Selecione</option>
                  {shippingRegions.filter((r) => isRegionActive(r.key)).map((r) => (
                    <option key={r.key} value={r.key}>{r.label} — {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((settings?.[`shipping_${r.key}` as keyof Settings] as number) || 0)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Cart */}
          {cart.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Carrinho</h4>
                <span className="text-xs text-gray-400">{cart.length} {cart.length === 1 ? 'item' : 'itens'}</span>
              </div>
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                {cart.map((item, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-2.5">
                    <div className="flex items-center gap-3">
                      {item.product.image_url ? <img src={item.product.image_url} alt="" className="w-8 h-10 rounded object-cover" /> : <div className="w-8 h-10 rounded bg-gray-200 flex items-center justify-center text-xs">👗</div>}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--color-primary)] truncate">{item.product.name}</p>
                        <p className="text-[10px] text-gray-500">{item.startDate} → {item.endDate} ({item.days} dias) • Tam: {item.size}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-medium text-[var(--color-primary)] block">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}</span>
                        <button onClick={() => removeFromCart(index)} className="text-[10px] text-red-400 hover:text-red-600 mt-1">remover</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon */}
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Cupom de Desconto</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="Digite o cupom..." value={couponCode} onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError('') }} disabled={!!appliedCoupon}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] disabled:bg-gray-50" />
                  {appliedCoupon ? (
                    <button onClick={removeCoupon} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600">Remover</button>
                  ) : (
                    <button onClick={applyCoupon} disabled={!couponCode.trim() || couponLoading} className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 disabled:opacity-50">
                      {couponLoading ? '...' : 'Aplicar'}
                    </button>
                  )}
                </div>
                {couponError && <p className="text-xs text-red-500 mt-1">{couponError}</p>}
                {appliedCoupon && <p className="text-xs text-green-600 mt-1">✓ {appliedCoupon.discount_type === 'percentage' ? `${appliedCoupon.discount_value}%` : `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(appliedCoupon.discount_value)}`} de desconto</p>}
              </div>

              {/* Totals */}
              <div className="space-y-1 mb-4">
                <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal)}</span></div>
                {deliveryMethod === 'delivery' && shippingRegion && (
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Frete</span><span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(shippingFee)}</span></div>
                )}
                {appliedCoupon && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Cupom {appliedCoupon.code}</span><span>-{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t border-gray-100 pt-2">
                  <span>Total</span><span className="text-[var(--color-accent)]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}</span>
                </div>
              </div>

              <button onClick={() => setShowPaymentModal(true)} disabled={!customer} className="w-full py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                💳 Pagamento na Loja
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">Pagamento</h3>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}</p>
            </div>
            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium text-gray-700 block">Forma de Pagamento</label>
              {Object.entries(paymentMethodLabels).map(([value, label]) => (
                <label key={value} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${paymentMethod === value ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="payment" value={value} checked={paymentMethod === value} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className="w-4 h-4 text-[var(--color-accent)]" />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-4 mb-4">
              <label className="text-xs font-medium text-gray-500 mb-2 block">Link Asaas</label>
              <div className="flex gap-2 mb-3">
                <button onClick={() => setAsaasBillingType('PIX')} className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border ${asaasBillingType === 'PIX' ? 'bg-green-500 text-white border-green-500' : 'border-gray-200'}`}>PIX</button>
                <button onClick={() => setAsaasBillingType('CREDIT_CARD')} className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border ${asaasBillingType === 'CREDIT_CARD' ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-200'}`}>Cartão</button>
              </div>
              <button onClick={handleGenerateAsaasLink} disabled={generatingLink} className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50">
                {generatingLink ? 'Gerando...' : 'Gerar Link Asaas'}
              </button>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPaymentModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleConfirmPayment} disabled={submitting} className="flex-1 py-2.5 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50">
                {submitting ? '...' : 'Confirmar na Loja'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Asaas Link Modal */}
      {showAsaasLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">Link de Pagamento</h3>
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700 font-medium">Link gerado!</p>
            </div>
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <input type="text" value={asaasLink} readOnly className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50" />
                <button onClick={() => { navigator.clipboard.writeText(asaasLink); alert('Copiado!') }} className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg text-sm font-medium">Copiar</button>
              </div>
            </div>
            {customer?.phone && (
              <a href={`https://wa.me/55${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Link pagamento: ${asaasLink}`)}`} target="_blank" rel="noopener noreferrer"
                className="w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 flex items-center justify-center gap-2 mb-4">
                Enviar WhatsApp
              </a>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setShowAsaasLinkModal(false); setAsaasLink('') }} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Fechar</button>
              <button onClick={handleConfirmAsaasLink} disabled={submitting} className="flex-1 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50">
                {submitting ? '...' : 'Confirmar Reserva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
