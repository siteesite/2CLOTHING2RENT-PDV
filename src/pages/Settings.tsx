import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

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
  whatsapp_number: string
}

const shippingRegions = [
  { key: 'southeast', label: 'Sudeste' },
  { key: 'south', label: 'Sul' },
  { key: 'central_west', label: 'Centro-Oeste' },
  { key: 'northeast', label: 'Nordeste' },
  { key: 'north', label: 'Norte' },
]

export function Settings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'asaas' | 'rental' | 'shipping'>('asaas')

  useEffect(() => {
    loadSettings()
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
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-400">Carregando...</div></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {[
          { key: 'asaas', label: 'Asaas', icon: '💳' },
          { key: 'rental', label: 'Locação', icon: '📅' },
          { key: 'shipping', label: 'Frete', icon: '🚚' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'asaas' && <AsaasSettings />}
      {activeTab === 'rental' && settings && <RentalSettings settings={settings} />}
      {activeTab === 'shipping' && settings && <ShippingSettings settings={settings} />}
    </div>
  )
}

function AsaasSettings() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
            <span className="text-2xl">💳</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-primary)]">Integração Asaas</h3>
            <p className="text-sm text-gray-500">Configure o gateway de pagamento</p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-[var(--color-primary)]">Como ativar no painel Asaas</h4>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-accent)] text-white text-xs font-bold flex items-center justify-center">1</span>
              <div>
                <p className="text-sm font-medium text-[var(--color-primary)]">Acesse o painel Asaas</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Vá para{' '}
                  <a href="https://www.asaas.com/login" target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent)] hover:underline font-medium">
                    asaas.com/login
                  </a>{' '}
                  e faça login com suas credenciais.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-accent)] text-white text-xs font-bold flex items-center justify-center">2</span>
              <div>
                <p className="text-sm font-medium text-[var(--color-primary)]">Gere a chave de API</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Navegue até <strong>Configurações → Integrações → API</strong> e copie a <strong>Chave de Acesso</strong> (token de produção).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-accent)] text-white text-xs font-bold flex items-center justify-center">3</span>
              <div>
                <p className="text-sm font-medium text-[var(--color-primary)]">Configure o webhook</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Em <strong>Configurações → Webhooks</strong>, adicione a URL abaixo e ative os eventos de pagamento.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-accent)] text-white text-xs font-bold flex items-center justify-center">4</span>
              <div>
                <p className="text-sm font-medium text-[var(--color-primary)]">Ative os eventos</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Marque os eventos: <strong>PAYMENT_RECEIVED</strong>, <strong>PAYMENT_CONFIRMED</strong>, <strong>PAYMENT_OVERDUE</strong>, <strong>PAYMENT_DELETED</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h4 className="text-sm font-semibold text-[var(--color-primary)] mb-4">Credenciais</h4>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">API Key (Produção)</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-gray-50 px-3 py-2.5 rounded-lg border border-gray-200 break-all text-gray-600">
                  $aact_prod_**********...**********
                </code>
                <span className="text-xs text-green-600 font-medium px-2 py-1 bg-green-50 rounded">Configurada</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Webhook Token</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-gray-50 px-3 py-2.5 rounded-lg border border-gray-200 break-all text-gray-600">
                  whsec_**********...**********
                </code>
                <span className="text-xs text-green-600 font-medium px-2 py-1 bg-green-50 rounded">Configurado</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h4 className="text-sm font-semibold text-[var(--color-primary)] mb-4">Webhook URL</h4>
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-green-700 font-medium">Webhook configurado e operacional</p>
          </div>
          <p className="text-xs text-gray-500 mb-2">URL configurada no painel Asaas:</p>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <code className="text-xs text-[var(--color-primary)] break-all leading-relaxed">
              https://supabase.clothing2rent.com.br/functions/v1/asaas-webhook
            </code>
          </div>
          <p className="text-xs text-gray-400 mt-2">Método: POST • Content-Type: application/json</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h4 className="text-sm font-semibold text-[var(--color-primary)] mb-4">Eventos a ativar</h4>
          <div className="space-y-2">
            {[
              { event: 'PAYMENT_RECEIVED', desc: 'Pagamento recebido' },
              { event: 'PAYMENT_CONFIRMED', desc: 'Pagamento confirmado' },
              { event: 'PAYMENT_OVERDUE', desc: 'Pagamento vencido' },
              { event: 'PAYMENT_DELETED', desc: 'Pagamento cancelado' },
              { event: 'PAYMENT_REFUNDED', desc: 'Pagamento estornado' },
            ].map((item) => (
              <div key={item.event} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                <div>
                  <code className="text-xs font-medium text-[var(--color-primary)]">{item.event}</code>
                  <p className="text-[10px] text-gray-500">{item.desc}</p>
                </div>
                <span className="w-2 h-2 rounded-full bg-green-400" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function RentalSettings({ settings }: { settings: Settings }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-[var(--color-primary)] mb-4">Regras de Locação</h3>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">Período mínimo</span>
            <span className="text-sm font-medium text-[var(--color-primary)]">{settings.rental_min_days} dias</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">Período máximo</span>
            <span className="text-sm font-medium text-[var(--color-primary)]">{settings.rental_max_days} dias</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">Buffer entre locações</span>
            <span className="text-sm font-medium text-[var(--color-primary)]">{settings.rental_buffer_days} dias</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-sm text-gray-500">Dias de preparação</span>
            <span className="text-sm font-medium text-[var(--color-primary)]">{settings.preparation_days || 0} dias</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-[var(--color-primary)] mb-4">Períodos de Locação</h3>
        <div className="space-y-2">
          {settings.rental_periods.map((period) => (
            <div key={period.days} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="text-sm font-medium text-[var(--color-primary)]">{period.days} dias</span>
                <p className="text-xs text-gray-500">{period.label}</p>
              </div>
              <span className="text-sm font-medium text-[var(--color-accent)]">
                {period.type === 'fixed' ? `+ R$ ${period.value}` : `+ ${period.value}%`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ShippingSettings({ settings }: { settings: Settings }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-[var(--color-primary)] mb-4">Tabela de Frete</h3>
        <div className="space-y-2">
          {shippingRegions.map((region) => {
            const active = settings[`shipping_active_${region.key}` as keyof Settings] as boolean
            const fee = settings[`shipping_${region.key}` as keyof Settings] as number
            const days = settings[`delivery_${region.key}` as keyof Settings] as number

            return (
              <div key={region.key} className={`flex items-center justify-between p-3 rounded-lg ${active ? 'bg-gray-50' : 'bg-red-50 opacity-60'}`}>
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${active ? 'bg-green-400' : 'bg-red-400'}`} />
                  <div>
                    <span className="text-sm font-medium text-[var(--color-primary)]">{region.label}</span>
                    <p className="text-xs text-gray-500">{days} dias úteis</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-[var(--color-primary)]">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fee)}
                  </span>
                  {!active && <p className="text-[10px] text-red-500">Inativo</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-[var(--color-primary)] mb-4">Prazos de Entrega</h3>
        <div className="space-y-3">
          {shippingRegions.map((region) => {
            const active = settings[`shipping_active_${region.key}` as keyof Settings] as boolean
            const days = settings[`delivery_${region.key}` as keyof Settings] as number

            if (!active) return null

            return (
              <div key={region.key} className="flex items-center gap-4">
                <span className="text-sm text-gray-600 w-32">{region.label}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-[var(--color-accent)] h-2 rounded-full"
                    style={{ width: `${(days / 5) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-[var(--color-primary)] w-16 text-right">{days} dias</span>
              </div>
            )
          })}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700">
            <strong>Nota:</strong> Os prazos são contados em dias úteis após a confirmação do pagamento.
            O frete é cobrado separado do valor da locação.
          </p>
        </div>
      </div>
    </div>
  )
}
