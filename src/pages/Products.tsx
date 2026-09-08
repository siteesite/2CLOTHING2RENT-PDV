import { useEffect, useState } from 'react'
import { getProducts } from '../services/supabase'
import type { Product } from '../types'

export function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [brandFilter, setBrandFilter] = useState('')
  const [sizeFilter, setSizeFilter] = useState('')
  const [colorFilter, setColorFilter] = useState('')

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    try {
      const data = await getProducts()
      setProducts(data.filter((p) => p.status === 'active'))
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
    } finally {
      setLoading(false)
    }
  }

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))].sort()
  const brands = [...new Set(products.map((p) => p.brand).filter(Boolean))].sort()
  const sizes = [...new Set(products.flatMap((p) => (p.size || '').split(';')).filter(Boolean))].sort()
  const colors = [...new Set(products.map((p) => p.color).filter(Boolean))].sort()

  const filtered = products.filter((p) => {
    const matchesSearch = !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.brand?.toLowerCase().includes(search.toLowerCase()) ||
      p.handle?.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = !categoryFilter || p.category === categoryFilter
    const matchesBrand = !brandFilter || p.brand === brandFilter
    const matchesSize = !sizeFilter || (p.size || '').includes(sizeFilter)
    const matchesColor = !colorFilter || p.color === colorFilter
    return matchesSearch && matchesCategory && matchesBrand && matchesSize && matchesColor
  })

  const hasFilters = search || categoryFilter || brandFilter || sizeFilter || colorFilter

  function clearFilters() {
    setSearch('')
    setCategoryFilter('')
    setBrandFilter('')
    setSizeFilter('')
    setColorFilter('')
  }

  function getImageUrl(product: Product): string | null {
    const url = product.image_url
    if (!url) return null
    if (url.includes('uggofsioqvqcnpwmnznp.supabase.co')) {
      return url.replace(
        'uggofsioqvqcnpwmnznp.supabase.co',
        'supabasekong-oui3g5xbsnm4gaghfx6d0ojp.185.225.22.183.sslip.io/storage/v1'
      ).replace('/storage/v1/object/public/', '/object/public/')
    }
    return url
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Carregando produtos...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Buscar por nome ou marca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-sm"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-sm"
          >
            <option value="">Categoria</option>
            {categories.map((cat) => (
              <option key={cat} value={cat!}>{cat}</option>
            ))}
          </select>
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-sm"
          >
            <option value="">Marca</option>
            {brands.map((brand) => (
              <option key={brand} value={brand!}>{brand}</option>
            ))}
          </select>
          <select
            value={sizeFilter}
            onChange={(e) => setSizeFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-sm"
          >
            <option value="">Tamanho</option>
            {sizes.map((size) => (
              <option key={size} value={size!}>{size}</option>
            ))}
          </select>
          <select
            value={colorFilter}
            onChange={(e) => setColorFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-sm"
          >
            <option value="">Cor</option>
            {colors.map((color) => (
              <option key={color} value={color!}>{color}</option>
            ))}
          </select>
        </div>
        {hasFilters && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              {filtered.length} produto{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={clearFilters}
              className="text-sm text-[var(--color-accent)] hover:underline"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filtered.map((product) => {
          const imageUrl = getImageUrl(product)

          return (
            <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-[3/4] bg-gray-100 relative">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">
                    👗
                  </div>
                )}
              </div>
              <div className="p-3">
                {product.brand && (
                  <p className="text-[10px] font-medium text-[var(--color-accent)] uppercase tracking-wide truncate">
                    {product.brand}
                  </p>
                )}
                <h3 className="text-xs font-semibold text-[var(--color-primary)] mt-0.5 line-clamp-2 leading-tight">
                  {product.name}
                </h3>
                <div className="flex items-center justify-between mt-2">
                  {product.price && (
                    <p className="text-sm font-bold text-[var(--color-primary)]">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {product.size && (
                    <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                      {product.size.split(';')[0]}
                    </span>
                  )}
                  {product.color && (
                    <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                      {product.color}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          Nenhum produto encontrado.
        </div>
      )}
    </div>
  )
}
