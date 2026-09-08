import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Product } from '../types'

export function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name')

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtered = products.filter((p) => {
    const matchesSearch = !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.brand?.toLowerCase().includes(search.toLowerCase()) ||
      p.handle?.toLowerCase().includes(search.toLowerCase())

    const matchesCategory = !categoryFilter || p.category === categoryFilter

    return matchesSearch && matchesCategory
  })

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Carregando produtos...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Buscar por nome, marca ou código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
        >
          <option value="">Todas categorias</option>
          {categories.map((cat) => (
            <option key={cat} value={cat!}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="text-sm text-gray-500">
        {filtered.length} produto{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          Nenhum produto encontrado.
        </div>
      )}
    </div>
  )
}

function ProductCard({ product }: { product: Product }) {
  const imageUrl = product.principal_image_url ||
    (product.images && typeof product.images === 'string'
      ? JSON.parse(product.images)?.[0]
      : Array.isArray(product.images) ? product.images[0] : null)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className="aspect-[3/4] bg-gray-100 relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">
            👗
          </div>
        )}
        {product.status && (
          <span className={`absolute top-2 right-2 text-xs font-medium px-2 py-1 rounded-full ${
            product.status === 'active' ? 'bg-green-100 text-green-700' :
            product.status === 'draft' ? 'bg-gray-100 text-gray-700' :
            'bg-yellow-100 text-yellow-700'
          }`}>
            {product.status}
          </span>
        )}
      </div>

      <div className="p-4">
        {product.brand && (
          <p className="text-xs font-medium text-[var(--color-accent)] uppercase tracking-wide">
            {product.brand}
          </p>
        )}
        <h3 className="text-sm font-semibold text-[var(--color-primary)] mt-1 line-clamp-2">
          {product.name}
        </h3>
        <div className="flex items-center justify-between mt-3">
          {product.price && (
            <p className="text-lg font-bold text-[var(--color-primary)]">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
            </p>
          )}
          {product.category && (
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">
              {product.category}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
