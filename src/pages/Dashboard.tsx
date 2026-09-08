import { useEffect, useState } from 'react'
import { getDashboardStats } from '../services/supabase'
import { supabase } from '../lib/supabase'
import type { DashboardStats } from '../types'

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [asaasBalance, setAsaasBalance] = useState<number | null>(null)
  const [loadingAsaas, setLoadingAsaas] = useState(true)

  useEffect(() => {
    loadStats()
    loadAsaasBalance()
  }, [])

  async function loadStats() {
    try {
      const data = await getDashboardStats()
      setStats(data)
    } catch (error) {
      console.error('Erro ao carregar stats:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadAsaasBalance() {
    try {
      const { data, error } = await supabase.functions.invoke('asaas-balance')
      if (error) throw error
      if (data?.balance !== undefined) {
        setAsaasBalance(data.balance)
      }
    } catch (error) {
      console.error('Erro ao carregar saldo Asaas:', error)
    } finally {
      setLoadingAsaas(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Reservas Hoje"
          value={stats?.today_reservations || 0}
          icon="📅"
          color="bg-blue-500"
        />
        <StatCard
          title="Retiradas Hoje"
          value={stats?.today_pickups || 0}
          icon="📦"
          color="bg-green-500"
        />
        <StatCard
          title="Devoluções Hoje"
          value={stats?.today_returns || 0}
          icon="↩"
          color="bg-purple-500"
        />
        <StatCard
          title="Atrasos"
          value={stats?.overdue_count || 0}
          icon="⚠"
          color="bg-red-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Produtos"
          value={stats?.total_products || 0}
          icon="👗"
          color="bg-emerald-500"
        />
        <StatCard
          title="Locações Ativas"
          value={stats?.active_rentals || 0}
          icon="🛍"
          color="bg-orange-500"
        />
        <StatCard
          title="Receita Hoje"
          value={stats?.today_revenue || 0}
          icon="💰"
          color="bg-yellow-500"
          formatCurrency
        />
        <StatCard
          title="Valores Pendentes"
          value={stats?.pending_amount || 0}
          icon="⏳"
          color="bg-gray-500"
          formatCurrency
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <span className="text-xl">💳</span>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--color-primary)]">Saldo Asaas</h3>
                <p className="text-xs text-gray-500">Gateway de pagamento</p>
              </div>
            </div>
            <button
              onClick={loadAsaasBalance}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              title="Atualizar saldo"
            >
              ↻ Atualizar
            </button>
          </div>
          {loadingAsaas ? (
            <div className="text-center py-4">
              <div className="text-gray-400 text-sm">Carregando saldo...</div>
            </div>
          ) : asaasBalance !== null ? (
            <div>
              <p className="text-3xl font-bold text-[var(--color-success)]">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(asaasBalance)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Saldo disponível para transferência</p>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">Não foi possível carregar o saldo</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <span className="text-xl">⚙</span>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--color-primary)]">Configurar Asaas</h3>
              <p className="text-xs text-gray-500">Ativar pagamentos no painel</p>
            </div>
          </div>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <span className="font-bold text-[var(--color-accent)] mt-0.5">1.</span>
              <p>Acesse <a href="https://www.asaas.com/login" target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent)] hover:underline font-medium">asaas.com/login</a></p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-[var(--color-accent)] mt-0.5">2.</span>
              <p>Vá em <strong>Configurações → Integrações → API</strong></p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-[var(--color-accent)] mt-0.5">3.</span>
              <p>Copie a <strong>Chave de Acesso</strong> (token de produção)</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-[var(--color-accent)] mt-0.5">4.</span>
              <p>Configure o webhook em <strong>Configurações → Webhooks</strong> com a URL do Supabase</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-[var(--color-accent)] mt-0.5">5.</span>
              <p>Ative os eventos: <strong>PAYMENT_RECEIVED</strong>, <strong>PAYMENT_CONFIRMED</strong>, <strong>PAYMENT_OVERDUE</strong></p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 font-medium mb-1">Webhook URL:</p>
            <code className="text-xs text-[var(--color-primary)] break-all">
              https://supabasekong-oui3g5xbsnm4gaghfx6d0ojp.185.225.22.183.sslip.io/functions/v1/asaas-webhook
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color, formatCurrency = false }: {
  title: string
  value: number
  icon: string
  color: string
  formatCurrency?: boolean
}) {
  const formattedValue = formatCurrency
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    : value.toString()

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <span className="text-2xl">{icon}</span>
        <span className={`${color} text-white text-xs font-medium px-2 py-1 rounded-full`}>
          {formattedValue}
        </span>
      </div>
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="text-2xl font-bold text-[var(--color-primary)] mt-1">{formattedValue}</p>
    </div>
  )
}
