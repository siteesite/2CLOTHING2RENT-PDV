import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Customer } from '../types'

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState<Customer | null>(null)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    cpf: '',
    note: '',
  })

  useEffect(() => {
    loadCustomers()
  }, [])

  async function loadCustomers() {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('first_name')
      if (error) throw error
      setCustomers(data || [])
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

  function openCreate() {
    setEditingCustomer(null)
    setForm({ first_name: '', last_name: '', email: '', phone: '', cpf: '', note: '' })
    setShowModal(true)
  }

  function openEdit(customer: Customer) {
    setEditingCustomer(customer)
    setForm({
      first_name: customer.first_name || '',
      last_name: customer.last_name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      cpf: (customer as any).cpf || '',
      note: customer.note || '',
    })
    setShowModal(true)
  }

  async function handleSave() {
    try {
      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update({
            first_name: form.first_name,
            last_name: form.last_name,
            email: form.email,
            phone: form.phone,
            cpf: form.cpf || null,
            note: form.note,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCustomer.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('customers')
          .insert({
            first_name: form.first_name,
            last_name: form.last_name,
            email: form.email,
            phone: form.phone,
            cpf: form.cpf || null,
            note: form.note,
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
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pedidos</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Gasto</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => (
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
                  <td className="px-6 py-4 text-sm text-gray-500">{customer.total_orders || 0}</td>
                  <td className="px-6 py-4 text-sm font-medium text-[var(--color-primary)]">
                    {customer.total_spent
                      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(customer.total_spent)
                      : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setShowDetailModal(customer)}
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">Nenhum cliente encontrado.</div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">
              {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Nome"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm"
                />
                <input
                  type="text"
                  placeholder="Sobrenome"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm"
                />
              </div>
              <input
                type="email"
                placeholder="E-mail"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="tel"
                  placeholder="Telefone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm"
                />
                <input
                  type="text"
                  placeholder="CPF"
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm"
                />
              </div>
              <textarea
                placeholder="Observações"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm"
                rows={3}
              />
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
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
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
                  {showDetailModal.email && (
                    <p className="text-sm text-gray-500">{showDetailModal.email}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <DetailRow label="E-mail" value={showDetailModal.email} />
                <DetailRow label="Telefone" value={showDetailModal.phone} />
                <DetailRow label="CPF" value={(showDetailModal as any).cpf} />
                <DetailRow label="Pedidos" value={showDetailModal.total_orders?.toString()} />
                <DetailRow
                  label="Total Gasto"
                  value={showDetailModal.total_spent
                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(showDetailModal.total_spent)
                    : undefined}
                />
                <DetailRow label="Marketing E-mail" value={showDetailModal.accepts_email_marketing ? 'Sim' : 'Não'} />
                <DetailRow label="Marketing SMS" value={showDetailModal.accepts_sms_marketing ? 'Sim' : 'Não'} />
                <DetailRow label="Observações" value={showDetailModal.note} />
                {showDetailModal.tags && (
                  <DetailRow label="Tags" value={Array.isArray(showDetailModal.tags) ? showDetailModal.tags.join(', ') : showDetailModal.tags} />
                )}
                {showDetailModal.default_address && (
                  <DetailRow
                    label="Endereço"
                    value={[
                      showDetailModal.default_address.address1,
                      showDetailModal.default_address.address2,
                      showDetailModal.default_address.city,
                      showDetailModal.default_address.province_code,
                      showDetailModal.default_address.zip,
                    ].filter(Boolean).join(', ') || undefined}
                  />
                )}
                <DetailRow label="Criado em" value={new Date(showDetailModal.created_at).toLocaleDateString('pt-BR')} />
                <DetailRow label="Atualizado em" value={new Date(showDetailModal.updated_at).toLocaleDateString('pt-BR')} />
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowDetailModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Fechar</button>
                <button
                  onClick={() => { setShowDetailModal(null); openEdit(showDetailModal) }}
                  className="flex-1 py-2.5 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-light)]"
                >
                  Editar
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
    <div className="flex justify-between py-2.5 border-b border-gray-100">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-[var(--color-primary)] text-right max-w-[60%]">{value || '—'}</span>
    </div>
  )
}
