import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { DashboardStats } from '../types'

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    today_reservations: 0,
    today_pickups: 0,
    today_returns: 0,
    overdue_count: 0,
    today_revenue: 0,
    pending_amount: 0,
    rented_products: 0,
    available_products: 0,
    cleaning_products: 0,
    maintenance_products: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    try {
      const today = new Date().toISOString().split('T')[0]

      const { count: reservations } = await supabase
        .from('rentals')
        .select('id', { count: 'exact', head: true })
        .gte('start_date', today)
        .lte('start_date', today)
        .in('status', ['confirmed', 'preparing', 'ready_for_pickup'])

      const { count: pickups } = await supabase
        .from('rentals')
        .select('id', { count: 'exact', head: true })
        .eq('start_date', today)
        .eq('status', 'ready_for_pickup')

      const { count: returns } = await supabase
        .from('rentals')
        .select('id', { count: 'exact', head: true })
        .eq('end_date', today)
        .eq('status', 'active')

      const { count: overdue } = await supabase
        .from('rentals')
        .select('id', { count: 'exact', head: true })
        .lt('end_date', today)
        .eq('status', 'active')

      const { count: products } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })

      setStats({
        today_reservations: reservations || 0,
        today_pickups: pickups || 0,
        today_returns: returns || 0,
        overdue_count: overdue || 0,
        today_revenue: 0,
        pending_amount: 0,
        rented_products: 0,
        available_products: products || 0,
        cleaning_products: 0,
        maintenance_products: 0,
      })
    } catch (error) {
      console.error('Erro ao carregar stats:', error)
    } finally {
      setLoading(false)
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
          value={stats.today_reservations}
          icon="📅"
          color="bg-blue-500"
        />
        <StatCard
          title="Retiradas Hoje"
          value={stats.today_pickups}
          icon="📦"
          color="bg-green-500"
        />
        <StatCard
          title="Devoluções Hoje"
          value={stats.today_returns}
          icon="↩"
          color="bg-purple-500"
        />
        <StatCard
          title="Atrasos"
          value={stats.overdue_count}
          icon="⚠"
          color="bg-red-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Produtos Disponíveis"
          value={stats.available_products}
          icon="👗"
          color="bg-emerald-500"
        />
        <StatCard
          title="Produtos Alugados"
          value={stats.rented_products}
          icon="🛍"
          color="bg-orange-500"
        />
        <StatCard
          title="Em Higienização"
          value={stats.cleaning_products}
          icon="🧹"
          color="bg-yellow-500"
        />
        <StatCard
          title="Em Manutenção"
          value={stats.maintenance_products}
          icon="🔧"
          color="bg-gray-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Faturamento Hoje</h3>
          <p className="text-3xl font-bold text-[var(--color-primary)]">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.today_revenue)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Valores Pendentes</h3>
          <p className="text-3xl font-bold text-[var(--color-warning)]">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.pending_amount)}
          </p>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color }: {
  title: string
  value: number
  icon: string
  color: string
}) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <span className="text-2xl">{icon}</span>
        <span className={`${color} text-white text-xs font-medium px-2 py-1 rounded-full`}>
          {value}
        </span>
      </div>
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="text-2xl font-bold text-[var(--color-primary)] mt-1">{value}</p>
    </div>
  )
}
