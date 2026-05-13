import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, X, ChevronDown, ChevronUp, Star } from 'lucide-react'
import api from '../api/client'
import ProductCard from '../components/storefront/ProductCard'
import { Pagination, EmptyState, ProductCardSkeleton } from '../components/ui'
import { Package } from 'lucide-react'

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 })
  const [loading, setLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ category: true, price: true })

  const search = searchParams.get('search') || ''
  const categoryId = searchParams.get('categoryId') || ''
  const minPrice = searchParams.get('minPrice') || ''
  const maxPrice = searchParams.get('maxPrice') || ''
  const sort = searchParams.get('sort') || 'newest'
  const page = parseInt(searchParams.get('page') || '1')

  const [localMin, setLocalMin] = useState(minPrice)
  const [localMax, setLocalMax] = useState(maxPrice)

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data.categories || [])).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (categoryId) params.set('categoryId', categoryId)
    if (minPrice) params.set('minPrice', minPrice)
    if (maxPrice) params.set('maxPrice', maxPrice)
    if (sort) params.set('sort', sort)
    params.set('page', String(page))

    api.get(`/products?${params}`).then(r => {
      setProducts(r.data.products || [])
      setPagination(r.data.pagination || { total: 0, page: 1, pages: 1 })
    }).catch(() => setProducts([])).finally(() => setLoading(false))
  }, [search, categoryId, minPrice, maxPrice, sort, page])

  const updateFilter = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams)
    if (value) p.set(key, value)
    else p.delete(key)
    p.delete('page')
    setSearchParams(p)
  }

  const clearFilters = () => {
    setSearchParams({})
    setLocalMin('')
    setLocalMax('')
  }

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const activeFilters = [search, categoryId, minPrice, maxPrice].filter(Boolean).length
  const selectedCategory = categories.find(c => String(c.id) === categoryId)

  const filterContent = (
    <>
      {/* Category Section */}
      <div className="border-b border-gray-100 pb-4 mb-4">
        <button onClick={() => toggleSection('category')} className="flex items-center justify-between w-full text-left">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Category</h4>
          {expandedSections.category ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </button>
        {expandedSections.category && (
          <div className="mt-3 space-y-1">
            <label className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${!categoryId ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${!categoryId ? 'border-primary-500' : 'border-gray-300'}`}>
                  {!categoryId && <div className="w-2 h-2 rounded-full bg-primary-500" />}
                </div>
                <input type="radio" name="category" checked={!categoryId} onChange={() => updateFilter('categoryId', '')} className="hidden" />
                <span className="text-sm">All Categories</span>
              </div>
            </label>
            {categories.map(cat => (
              <label key={cat.id} className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${categoryId === String(cat.id) ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${categoryId === String(cat.id) ? 'border-primary-500' : 'border-gray-300'}`}>
                    {categoryId === String(cat.id) && <div className="w-2 h-2 rounded-full bg-primary-500" />}
                  </div>
                  <input type="radio" name="category" checked={categoryId === String(cat.id)} onChange={() => updateFilter('categoryId', String(cat.id))} className="hidden" />
                  <span className="text-sm">{cat.name}</span>
                </div>
                <span className="text-xs text-gray-400">{cat.product_count}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Price Section */}
      <div className="border-b border-gray-100 pb-4 mb-4">
        <button onClick={() => toggleSection('price')} className="flex items-center justify-between w-full text-left">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Price</h4>
          {expandedSections.price ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </button>
        {expandedSections.price && (
          <div className="mt-3">
            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Min</label>
                <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="₹0" value={localMin} onChange={e => setLocalMin(e.target.value.replace(/[^0-9]/g, ''))} className="input text-sm py-2" />
              </div>
              <span className="text-gray-300 mt-5">–</span>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Max</label>
                <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="₹99999" value={localMax} onChange={e => setLocalMax(e.target.value.replace(/[^0-9]/g, ''))} className="input text-sm py-2" />
              </div>
            </div>
            <button
              onClick={() => {
                const p = new URLSearchParams(searchParams)
                if (localMin) p.set('minPrice', localMin); else p.delete('minPrice')
                if (localMax) p.set('maxPrice', localMax); else p.delete('maxPrice')
                p.delete('page')
                setSearchParams(p)
              }}
              className="w-full mt-3 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Apply Price
            </button>
          </div>
        )}
      </div>

      {/* Active Filters */}
      {activeFilters > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Applied</h4>
            <button onClick={clearFilters} className="text-xs text-primary-500 hover:text-primary-700 font-medium">Clear All</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {search && (
              <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 pl-2.5 pr-1.5 py-1 rounded-md">
                {search}
                <button onClick={() => updateFilter('search', '')} className="hover:text-red-500 p-0.5"><X size={11} /></button>
              </span>
            )}
            {categoryId && (
              <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 pl-2.5 pr-1.5 py-1 rounded-md">
                {selectedCategory?.name}
                <button onClick={() => updateFilter('categoryId', '')} className="hover:text-red-500 p-0.5"><X size={11} /></button>
              </span>
            )}
            {(minPrice || maxPrice) && (
              <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 pl-2.5 pr-1.5 py-1 rounded-md">
                ₹{minPrice || '0'} – ₹{maxPrice || '∞'}
                <button onClick={() => { updateFilter('minPrice', ''); updateFilter('maxPrice', ''); setLocalMin(''); setLocalMax('') }} className="hover:text-red-500 p-0.5"><X size={11} /></button>
              </span>
            )}
          </div>
        </div>
      )}
    </>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="page-container py-4 sm:py-6">
        {/* Top bar: breadcrumb style + results count + sort */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
              {search ? `Results for "${search}"` : selectedCategory ? selectedCategory.name : 'All Products'}
            </h1>
            <span className="text-xs text-gray-400 flex-shrink-0 bg-gray-100 px-2 py-0.5 rounded-full">
              {pagination.total}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <select value={sort} onChange={e => updateFilter('sort', e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-400">
              <option value="newest">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="popular">Most Popular</option>
            </select>
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="md:hidden flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm font-medium text-gray-700"
            >
              <SlidersHorizontal size={14} />
              Filters
            </button>
          </div>
        </div>

        <div className="flex gap-5">
          {/* Desktop Sidebar */}
          <aside className="hidden md:block w-56 lg:w-60 flex-shrink-0">
            <div className="sticky top-20 bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900">Filters</h3>
              </div>
              {filterContent}
            </div>
          </aside>

          {/* Mobile Filter Drawer */}
          {filtersOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setFiltersOpen(false)} />}
          <div className={`
            fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-white shadow-2xl
            transform transition-transform duration-300 ease-out md:hidden
            ${filtersOpen ? 'translate-x-0' : '-translate-x-full'}
          `}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Filters</h3>
              <button onClick={() => setFiltersOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-4 overflow-y-auto h-[calc(100%-120px)]">
              {filterContent}
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-white">
              <button onClick={() => setFiltersOpen(false)} className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-colors">
                Show Products
              </button>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 min-w-0">
            {/* Showing X of Y */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500">
                Showing {products.length > 0 ? ((page - 1) * 20 + 1) : 0}–{Math.min(page * 20, pagination.total)} of {pagination.total} products
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {Array(12).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)}
              </div>
            ) : products.length === 0 ? (
              <EmptyState
                icon={<Package size={56} />}
                title="No products found"
                description={search ? `No results for "${search}". Try different keywords.` : 'No products match your filters.'}
                action={<button onClick={clearFilters} className="btn-primary">Clear Filters</button>}
              />
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {products.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
                <Pagination page={page} pages={pagination.pages} onChange={p => updateFilter('page', String(p))} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
