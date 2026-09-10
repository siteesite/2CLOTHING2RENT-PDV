import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Customer } from '../types'

interface CustomerOrder {
  order_name: string
  financial_status: string
  total_price: number
  line_items: any[]
  created_at: string
}

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState<Customer | null>(null)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    cpf: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    note: '',
  })

  useEffect(() => {
    loadCustomers()
  }, [])

  async function loadCustomers() {
    try {
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('first_name')
      if (customersError) throw customersError

      const { data: ordersData } = await supabase
        .from('orders')
        .select('email, customer_phone, customer_cpf, billing_address, shipping_address')

      const ordersByEmail: Record<string, any[]> = {}
      for (const order of ordersData || []) {
        if (order.email) {
          if (!ordersByEmail[order.email]) ordersByEmail[order.email] = []
          ordersByEmail[order.email].push(order)
        }
      }

      const enriched = (customersData || []).map((customer) => {
        const orders = ordersByEmail[customer.email] || []
        if (orders.length === 0) return customer

        const latestOrder = orders[0]
        const addr = customer.default_address?.street ? customer.default_address : (latestOrder.shipping_address || latestOrder.billing_address || {})

        return {
          ...customer,
          cpf: customer.cpf || latestOrder.customer_cpf || null,
          phone: customer.phone || latestOrder.customer_phone || null,
          default_address: {
            zip: addr.zip || '',
            street: addr.street || '',
            number: addr.number || '',
            complement: addr.complement || '',
            neighborhood: addr.neighborhood || '',
            city: addr.city || '',
            state: addr.state || addr.province || '',
            name: addr.name || '',
          },
        }
      })

      setCustomers(enriched)
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtered = customers.filter((c) => {
    if (!search) return true
    const term = search.toLowerCase()
    return (
      c.first_name?.toLowerCase().includes(term) ||
      c.last_name?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.phone?.includes(search) ||
      (c as any).cpf?.includes(search)
    )
  })

  async function fetchAddressByCep(cep: string) {
    const cleanCep = cep.replace(/\D/g, '')
    if (cleanCep.length !== 8) return

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
      const data = await response.json()

      if (!data.erro) {
        setForm((prev) => ({
          ...prev,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
          complement: data.complemento || prev.complement,
        }))
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error)
    }
  }

  function openCreate() {
    setEditingCustomer(null)
    setForm({
      first_name: '', last_name: '', email: '', phone: '', cpf: '',
      cep: '', street: '', number: '', complement: '', neighborhood: '',
      city: '', state: '', note: '',
    })
    setShowModal(true)
  }

  function openEdit(customer: Customer) {
    setEditingCustomer(customer)
    const addr = (customer as any).default_address || {}
    setForm({
      first_name: customer.first_name || '',
      last_name: customer.last_name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      cpf: (customer as any).cpf || '',
      cep: addr.zip || '',
      street: addr.street || '',
      number: addr.number || '',
      complement: addr.complement || '',
      neighborhood: addr.neighborhood || '',
      city: addr.city || '',
      state: addr.state || '',
      note: customer.note || '',
    })
    setShowModal(true)
  }

  async function openDetail(customer: Customer) {
    setShowDetailModal(customer)
    setLoadingOrders(true)
    try {
      const { data } = await supabase
        .from('orders')
        .select('order_name, financial_status, total_price, line_items, created_at')
        .eq('email', customer.email)
        .order('created_at', { ascending: false })
        .limit(10)
      setCustomerOrders(data || [])
    } catch (error) {
      setCustomerOrders([])
    } finally {
      setLoadingOrders(false)
    }
  }

  async function handleSave() {
    try {
      const customerData = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        cpf: form.cpf || null,
        note: form.note,
        default_address: {
          zip: form.cep,
          street: form.street,
          number: form.number,
          complement: form.complement,
          neighborhood: form.neighborhood,
          city: form.city,
          state: form.state,
          name: `${form.first_name} ${form.last_name}`.trim(),
        },
        updated_at: new Date().toISOString(),
      }

      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', editingCustomer.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('customers')
          .insert({
            ...customerData,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
          })
        if (error) throw error
      }
      setShowModal(false)
      setEditingCustomer(null)
      loadCustomers()
    } catch (error) {
      console.error('Erro ao salvar cliente:', error)
      alert('Erro ao salvar cliente.')
    }
  }

  async function handleDelete(customer: Customer) {
    if (!confirm(`Deseja excluir o cliente ${customer.first_name} ${customer.last_name}?`)) return
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customer.id)
      if (error) throw error
      setShowDetailModal(null)
      loadCustomers()
    } catch (error) {
      console.error('Erro ao excluir cliente:', error)
      alert('Erro ao excluir cliente.')
    }
  }

  const statusColors: Record<string, string> = {
    paid: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    refunded: 'bg-gray-100 text-gray-700',
    voided: 'bg-red-100 text-red-700',
  }

  const statusLabels: Record<string, string> = {
    paid: 'Pago',
    pending: 'Pendente',
    refunded: 'Estornado',
    voided: 'Cancelado',
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-400">Carregando clientes...</div></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Buscar por nome, e-mail, telefone ou CPF..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
        />
        <button
          onClick={openCreate}
          className="px-6 py-2.5 bg-[var(--color-accent)] text-white rounded-lg font-medium hover:bg-[var(--color-accent-light)] transition-colors"
        >
          + Novo Cliente
        </button>
      </div>

      <div className="text-sm text-gray-500">
        {filtered.length} cliente{filtered.length !== 1 ? 's' : ''}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">E-mail</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Telefone</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">CPF</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Endereço</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cidade/UF</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => {
                const addr = (customer as any).default_address
                const cityUf = addr?.city && addr?.state ? `${addr.city}/${addr.state}` : addr?.city || ''
                const address = addr?.street ? `${addr.street}${addr.number ? ', ' + addr.number : ''}` : ''

                return (
                  <tr key={customer.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-xs font-medium">
                          {customer.first_name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="font-medium text-sm text-[var(--color-primary)]">
                          {customer.first_name} {customer.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{customer.email || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{customer.phone || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{(customer as any).cpf || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate" title={address}>{address || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{cityUf || '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openDetail(customer)}
                          className="p-2 rounded-lg hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition-colors"
                          title="Ver detalhes"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openEdit(customer)}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Editar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">Nenhum cliente encontrado.</div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-6">
              {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
            </h3>

            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Dados Pessoais</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Nome *"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Sobrenome *"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm"
                  />
                  <input
                    type="email"
                    placeholder="E-mail *"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm"
                  />
                  <input
                    type="tel"
                    placeholder="Telefone *"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm"
                  />
                  <input
                    type="text"
                    placeholder="CPF *"
                    value={form.cpf}
                    onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm"
                  />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Endereço</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="CEP"
                    value={form.cep}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 8)
                      setForm({ ...form, cep: value })
                      if (value.length === 8) fetchAddressByCep(value)
                    }}
                    maxLength={8}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Rua"
                    value={form.street}
                    onChange={(e) => setForm({ ...form, street: e.target.value })}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm sm:col-span-2"
                  />
                  <input
                    type="text"
                    placeholder="Número"
                    value={form.number}
                    onChange={(e) => setForm({ ...form, number: e.target.value })}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Complemento"
                    value={form.complement}
                    onChange={(e) => setForm({ ...form, complement: e.target.value })}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Bairro"
                    value={form.neighborhood}
                    onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Cidade"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm"
                  />
                  <select
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm"
                  >
                    <option value="">Estado</option>
                    {['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Observações</h4>
                <textarea
                  placeholder="Observações sobre o cliente..."
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} className="flex-1 py-2.5 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-light)]">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-[var(--color-primary)]">Detalhes do Cliente</h3>
                <button onClick={() => setShowDetailModal(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-2xl font-medium">
                  {showDetailModal.first_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-[var(--color-primary)]">
                    {showDetailModal.first_name} {showDetailModal.last_name}
                  </h4>
                  {showDetailModal.email && <p className="text-sm text-gray-500">{showDetailModal.email}</p>}
                  {showDetailModal.phone && <p className="text-sm text-gray-500">{showDetailModal.phone}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-sm font-semibold text-[var(--color-primary)] mb-3">Dados Pessoais</h4>
                  <div className="space-y-1">
                    <DetailRow label="E-mail" value={showDetailModal.email} />
                    <DetailRow label="Telefone" value={showDetailModal.phone} />
                    <DetailRow label="CPF" value={(showDetailModal as any).cpf} />
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[var(--color-primary)] mb-3">Endereço</h4>
                  <div className="space-y-1">
                    <DetailRow label="CEP" value={(showDetailModal as any).default_address?.zip} />
                    <DetailRow label="Rua" value={(showDetailModal as any).default_address?.street} />
                    <DetailRow label="Número" value={(showDetailModal as any).default_address?.number} />
                    <DetailRow label="Complemento" value={(showDetailModal as any).default_address?.complement} />
                    <DetailRow label="Bairro" value={(showDetailModal as any).default_address?.neighborhood} />
                    <DetailRow label="Cidade" value={(showDetailModal as any).default_address?.city} />
                    <DetailRow label="Estado" value={(showDetailModal as any).default_address?.state} />
                  </div>
                </div>
              </div>

              {showDetailModal.note && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-[var(--color-primary)] mb-2">Observações</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{showDetailModal.note}</p>
                </div>
              )}

              <div className="mb-6">
                <h4 className="text-sm font-semibold text-[var(--color-primary)] mb-3">Histórico de Pedidos</h4>
                {loadingOrders ? (
                  <p className="text-sm text-gray-400">Carregando pedidos...</p>
                ) : customerOrders.length > 0 ? (
                  <div className="space-y-2">
                    {customerOrders.map((order, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-[var(--color-primary)]">{order.order_name}</p>
                          <p className="text-xs text-gray-500">
                            {order.line_items?.map((item: any) => item.name).join(', ')}
                          </p>
                          <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[order.financial_status] || 'bg-gray-100'}`}>
                            {statusLabels[order.financial_status] || order.financial_status}
                          </span>
                          <p className="text-sm font-bold text-[var(--color-primary)] mt-1">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_price)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Nenhum pedido encontrado.</p>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowDetailModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Fechar</button>
                <button
                  onClick={() => { setShowDetailModal(null); openEdit(showDetailModal) }}
                  className="flex-1 py-2.5 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-light)]"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(showDetailModal)}
                  className="px-4 py-2.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between py-1.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-medium text-[var(--color-primary)] text-right">{value || '—'}</span>
    </div>
  )
}
