import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ category: true, price: true, brand: false, rating: false, availability: false })
  const [brands, setBrands] = useState<any[]>([])
  const [showCatModal, setShowCatModal] = useState(false)
  const search = searchParams.get('search') || ''
  const categoryId = searchParams.get('categoryId') || ''
  const minPrice = searchParams.get('minPrice') || ''
  const maxPrice = searchParams.get('maxPrice') || ''
  const sort = searchParams.get('sort') || 'newest'
  const page = parseInt(searchParams.get('page') || '1')
  const brandIds = searchParams.get('brandIds') || ''
  const rating = searchParams.get('rating') || ''
  const availability = searchParams.get('availability') || ''

  const [localMin, setLocalMin] = useState(minPrice)
  const [localMax, setLocalMax] = useState(maxPrice)

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data.categories || [])).catch(() => {})
  }, [])

  useEffect(() => {
    const params: any = {}
    if (categoryId) params.subcategoryId = categoryId
    api.get('/brands' + (categoryId ? `?subcategoryId=${categoryId}` : '')).then(r => setBrands(r.data.brands || [])).catch(() => setBrands([]))
  }, [categoryId])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (categoryId) params.set('categoryId', categoryId)
    if (minPrice) params.set('minPrice', minPrice)
    if (maxPrice) params.set('maxPrice', maxPrice)
    if (sort) params.set('sort', sort)
    if (brandIds) params.set('brandIds', brandIds)
    if (rating) params.set('rating', rating)
    if (availability) params.set('availability', availability)
    params.set('page', String(page))
    params.set('limit', '20')

    api.get(`/products?${params}`).then(r => {
      setProducts(r.data.products || [])
      setPagination(r.data.pagination || { total: 0, page: 1, pages: 1 })
    }).catch(() => setProducts([])).finally(() => setLoading(false))
  }, [search, categoryId, minPrice, maxPrice, sort, page, brandIds, rating, availability])

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

  const activeFilters = [search, categoryId, minPrice, maxPrice, brandIds, rating, availability].filter(Boolean).length
  const selectedCategory = categories.find(c => String(c.id) === categoryId)

  const filterContent = (
    <>
      {/* Category Section */}
      <div className="border-b border-gray-100 pb-4 mb-4">
        <button onClick={() => toggleSection('category')} className="flex items-center justify-between w-full text-left">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Categories</h4>
          {expandedSections.category ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </button>
        {expandedSections.category && (
        <div className="mt-3">
          {/* All Categories option */}
          <div
            className={`py-2.5 px-3 -mx-1 rounded-lg cursor-pointer text-sm transition-colors mb-1 ${!categoryId ? 'bg-primary-50 text-primary-600 font-semibold' : 'text-gray-600 hover:bg-primary-50 hover:text-primary-600'}`}
            onClick={() => updateFilter('categoryId', '')}
          >
            All Categories
          </div>
          {(() => {
              // Determine navigation state
              const selectedCat = categories.find(c => String(c.id) === categoryId)
              const activeParent = selectedCat?.parent_id
                ? categories.find(c => c.id === selectedCat.parent_id)
                : categories.find(c => !c.parent_id && (String(c.id) === categoryId || categories.filter(s => s.parent_id === c.id).some(s => String(s.id) === categoryId)))

              // If we have drilled into a parent category, show back nav + subcategories
              if (activeParent && categories.filter(s => s.parent_id === activeParent.id).length > 0) {
                const subs = categories.filter(s => s.parent_id === activeParent.id)
                return (
                  <>
                    {/* Back navigation */}
                    <div
                      className="flex items-center gap-1.5 py-2 px-2 -mx-1 rounded-lg cursor-pointer text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors mb-1"
                      onClick={() => updateFilter('categoryId', '')}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                      <span>Back</span>
                    </div>
                    {/* Parent name as heading */}
                    <div className="py-2 px-2 -mx-1 text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-400"><path d="M19 9l-7 7-7-7"/></svg>
                      {activeParent.name}
                    </div>
                    {/* Subcategories list */}
                    <div className="pl-3 ml-1.5 border-l-2 border-gray-200">
                      {subs.map(sub => (
                        <div
                          key={sub.id}
                          className={`py-2 px-2 rounded-md cursor-pointer text-sm transition-colors ${categoryId === String(sub.id) ? 'bg-primary-50 text-primary-600 font-medium' : 'text-gray-600 hover:bg-primary-50 hover:text-primary-600'}`}
                          onClick={() => updateFilter('categoryId', String(sub.id))}
                        >
                          {sub.name}
                        </div>
                      ))}
                    </div>
                  </>
                )
              }

              // Default: show all parent categories with > arrows
              return (
                <div>
                  {categories.filter(c => !c.parent_id).map(cat => {
                    const subs = categories.filter(c => c.parent_id === cat.id)
                    return (
                      <div
                        key={cat.id}
                        className={`flex items-center justify-between py-2.5 px-3 -mx-1 rounded-lg cursor-pointer transition-colors ${categoryId === String(cat.id) ? 'bg-primary-50 text-primary-600 font-semibold' : 'text-gray-600 hover:bg-primary-50 hover:text-primary-600'}`}
                        onClick={() => updateFilter('categoryId', categoryId === String(cat.id) ? '' : String(cat.id))}
                      >
                        <span className={`text-sm ${categoryId === String(cat.id) ? 'font-semibold text-primary-600' : ''}`}>{cat.name}</span>
                        {subs.length > 0 && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400"><path d="M9 18l6-6-6-6"/></svg>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
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

      {/* Brand Section */}
      {brands.length > 0 && (
        <div className="border-b border-gray-100 pb-4 mb-4">
          <button onClick={() => toggleSection('brand')} className="flex items-center justify-between w-full text-left">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Brand</h4>
            {expandedSections.brand ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </button>
          {expandedSections.brand && (
            <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
              {brands.map(b => {
                const selectedBrands = brandIds ? brandIds.split(',').map(Number) : []
                const isChecked = selectedBrands.includes(b.id)
                return (
                  <label key={b.id} className="flex items-center gap-2 py-1.5 px-2 -mx-1 rounded-lg cursor-pointer hover:bg-gray-50 text-sm">
                    <input type="checkbox" checked={isChecked} onChange={() => {
                      const p = new URLSearchParams(searchParams)
                      let newIds: number[]
                      if (isChecked) {
                        newIds = selectedBrands.filter(id => id !== b.id)
                      } else {
                        newIds = [...selectedBrands, b.id]
                      }
                      if (newIds.length > 0) p.set('brandIds', newIds.join(','))
                      else p.delete('brandIds')
                      p.delete('page')
                      setSearchParams(p)
                    }} className="rounded" />
                    <span className="text-gray-700 flex-1">{b.name}</span>
                    <span className="text-[10px] text-gray-400">{b.product_count}</span>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Rating Section */}
      <div className="border-b border-gray-100 pb-4 mb-4">
        <button onClick={() => toggleSection('rating')} className="flex items-center justify-between w-full text-left">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Rating</h4>
          {expandedSections.rating ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </button>
        {expandedSections.rating && (
          <div className="mt-3 space-y-1">
            {[4, 3, 2, 1].map(r => (
              <label
                key={r}
                className={`flex items-center gap-2 py-2 px-2 -mx-1 rounded-lg cursor-pointer transition-colors ${rating === String(r) ? 'bg-primary-50 text-primary-600' : 'hover:bg-primary-50 hover:text-primary-600'}`}
              >
                <input
                  type="checkbox"
                  checked={rating === String(r)}
                  onChange={() => updateFilter('rating', rating === String(r) ? '' : String(r))}
                  className="rounded accent-primary-500"
                />
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={12} className={i < r ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'} />
                  ))}
                </div>
                <span className="text-xs text-gray-600">& Up</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Availability Section */}
      <div className="border-b border-gray-100 pb-4 mb-4">
        <button onClick={() => toggleSection('availability')} className="flex items-center justify-between w-full text-left">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Availability</h4>
          {expandedSections.availability ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </button>
        {expandedSections.availability && (
          <div className="mt-3 space-y-1">
            {[
              { value: 'in_stock', label: 'In Stock' },
              { value: 'out_of_stock', label: 'Out of Stock' },
            ].map(opt => (
              <div
                key={opt.value}
                className={`py-2 px-2 -mx-1 rounded-lg cursor-pointer text-sm transition-colors ${availability === opt.value ? 'bg-primary-50 text-primary-600 font-medium' : 'text-gray-600 hover:bg-primary-50 hover:text-primary-600'}`}
                onClick={() => updateFilter('availability', availability === opt.value ? '' : opt.value)}
              >
                {opt.label}
              </div>
            ))}
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
            {brandIds && (
              <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 pl-2.5 pr-1.5 py-1 rounded-md">
                {brandIds.split(',').length} brand{brandIds.split(',').length > 1 ? 's' : ''}
                <button onClick={() => updateFilter('brandIds', '')} className="hover:text-red-500 p-0.5"><X size={11} /></button>
              </span>
            )}
            {rating && (
              <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 pl-2.5 pr-1.5 py-1 rounded-md">
                {rating}★ & Up
                <button onClick={() => updateFilter('rating', '')} className="hover:text-red-500 p-0.5"><X size={11} /></button>
              </span>
            )}
            {availability && (
              <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 pl-2.5 pr-1.5 py-1 rounded-md">
                {availability === 'in_stock' ? 'In Stock' : 'Out of Stock'}
                <button onClick={() => updateFilter('availability', '')} className="hover:text-red-500 p-0.5"><X size={11} /></button>
              </span>
            )}
          </div>
        </div>
      )}
    </>
  )

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      <div className="page-container py-3 sm:py-4">
        <div className="flex gap-4">
          {/* Desktop Sidebar - full height left */}
          <aside className="hidden md:block w-52 lg:w-56 flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="14" y2="12"/><line x1="4" y1="18" x2="9" y2="18"/></svg>
                Filters
              </h3>
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

          {/* Right content: breadcrumb + count + sort + grid */}
          <div className="flex-1 min-w-0">
            {/* Breadcrumb */}
            <nav className="text-xs text-gray-400 mb-1 flex items-center gap-1 flex-wrap">
              <Link to="/" className="hover:text-primary-600">Home</Link>
              {(() => {
                if (!selectedCategory) return null
                const parent = selectedCategory.parent_id
                  ? categories.find(c => c.id === selectedCategory.parent_id)
                  : null
                return (
                  <>
                    {parent && (
                      <>
                        <span>›</span>
                        <Link to={`/products?categoryId=${parent.id}`} className="hover:text-primary-600 truncate max-w-[120px]">{parent.name}</Link>
                      </>
                    )}
                    <span>›</span>
                    <span className="text-gray-600">{selectedCategory.name}</span>
                  </>
                )
              })()}
            </nav>

            {/* Results count */}
            <p className="text-sm font-medium text-gray-900 mb-2">
              {search
                ? <>Showing {products.length > 0 ? ((page - 1) * 20 + 1) : 0}–{Math.min(page * 20, pagination.total)} of {pagination.total} results for "{search}"</>
                : <>Showing {products.length > 0 ? ((page - 1) * 20 + 1) : 0}–{Math.min(page * 20, pagination.total)} of {pagination.total} products</>
              }
            </p>

            {/* Sort tabs */}
            <div className="flex items-center gap-3 border-b border-gray-200 mb-3">
              <span className="text-xs text-gray-500 font-medium py-2">Sort By</span>
              {[
                { value: 'popular', label: 'Popularity' },
                { value: 'price_asc', label: 'Price ↑' },
                { value: 'price_desc', label: 'Price ↓' },
                { value: 'newest', label: 'Newest' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateFilter('sort', opt.value)}
                  className={`text-xs py-1.5 px-3 rounded-full transition-colors ${sort === opt.value ? 'bg-primary-500 text-white font-medium' : 'text-gray-500 hover:text-primary-600 hover:bg-primary-50'}`}
                >
                  {opt.label}
                </button>
              ))}
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="md:hidden ml-auto flex items-center gap-1.5 px-2 py-1.5 border border-gray-200 rounded bg-white text-xs font-medium text-gray-700"
              >
                <SlidersHorizontal size={12} />
                Filters
              </button>
            </div>

            {/* Product grid */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4">
                {Array(9).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)}
              </div>
            ) : products.length === 0 ? (
              <EmptyState
                icon={<Package size={48} />}
                title="No products found"
                description={search ? `No results for "${search}". Try different keywords.` : 'No products match your filters.'}
                action={<button onClick={clearFilters} className="btn-primary text-sm">Clear Filters</button>}
              />
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4">
                  {products.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
                <Pagination page={page} pages={pagination.pages} onChange={p => updateFilter('page', String(p))} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Categories Modal */}
    {showCatModal && (
      <>
        <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setShowCatModal(false)} />
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] bg-white rounded-2xl shadow-2xl w-[90vw] max-w-lg max-h-[80vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 text-lg">All Categories</h3>
            <button onClick={() => setShowCatModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
              <X size={18} />
            </button>
          </div>
          <div className="p-4 overflow-y-auto max-h-[calc(80vh-70px)]">
            <div className="grid grid-cols-2 gap-2">
              {categories.filter(c => !c.parent_id).map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { updateFilter('categoryId', String(cat.id)); setShowCatModal(false) }}
                  className={`flex items-center gap-2 px-3 py-3 rounded-xl border text-left text-sm font-medium transition-colors ${
                    categoryId === String(cat.id)
                      ? 'border-primary-400 bg-primary-50 text-primary-700'
                      : 'border-gray-100 hover:border-primary-300 hover:bg-primary-50 text-gray-700 hover:text-primary-700'
                  }`}
                >
                  {cat.image_url ? (
                    <img src={cat.image_url} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs flex-shrink-0">📦</div>
                  )}
                  <span className="truncate">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </>
    )}
    </>
  )
}
